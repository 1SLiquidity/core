// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/// @notice Minimal interface for Uniswap V3 QuoterV2
interface IQuoterV2 {
    struct QuoteExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint24 fee;
        uint160 sqrtPriceLimitX96; // 0 for no limit
    }

    struct QuoteExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint256 amount;
        uint24 fee;
        uint160 sqrtPriceLimitX96; // 0 for no limit
    }

    function quoteExactInputSingle(QuoteExactInputSingleParams calldata params)
        external
        returns (
            uint256 amountOut,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        );

    function quoteExactOutputSingle(QuoteExactOutputSingleParams calldata params)
        external
        returns (
            uint256 amountIn,
            uint160 sqrtPriceX96After,
            uint32 initializedTicksCrossed,
            uint256 gasEstimate
        );
}

/**
 * @dev Refactored, configurable fetcher for Uniswap V3 pools.
 *
 * Goals (while preserving existing public function signatures):
 *  - Make getReserves() safer (no div-by-zero; handle uninitialized / zero-liquidity pools).
 *  - Keep getReserves() working on the configured `fee` tier for backward compatibility.
 *  - Add helpers to scan multiple fee tiers and pick the best pool.
 *  - Expose a QuoterV2-backed getQuote() that finds the best tier for exact-in quotes.
 *  - Add helpers for exact-out quoting and computing sqrtPriceLimitX96 for slippage.
 */
contract UniswapV3Fetcher is IUniversalDexInterface {
    // ======= Existing fields (kept) =======
    address public factory;
    uint24 public fee; // default fee tier used by getReserves() and getPoolAddress()

    // ======= New fields (non-breaking additions) =======
    address public quoterV2; // must be set post-deploy via setQuoterV2()
    address public owner;    // simple ownership for admin setters

    // ======= Events =======
    event QuoterV2Updated(address indexed oldQuoter, address indexed newQuoter);
    event OwnerTransferred(address indexed oldOwner, address indexed newOwner);

    // ======= Modifiers =======
    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor(address _factory, uint24 _fee) {
        factory = _factory;
        fee = _fee; // kept for backward compatibility
        owner = msg.sender;
        emit OwnerTransferred(address(0), msg.sender);
    }

    // ======= Admin setters (additive; do not break existing integrations) =======
    function setQuoterV2(address _quoter) external onlyOwner {
        emit QuoterV2Updated(quoterV2, _quoter);
        quoterV2 = _quoter;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ======= INTERNAL: Safe virtual reserves calculation =======
    /// @dev Returns (ok, reserveA, reserveB, L) where reserveA/B correspond to tokenA/tokenB order given.
    function _virtualReserves(address pool, address tokenA, address tokenB)
        internal
        view
        returns (bool ok, uint256 reserveA, uint256 reserveB, uint128 L)
    {
        if (pool == address(0)) return (false, 0, 0, 0);

        (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(pool).slot0();
        if (sqrtPriceX96 == 0) return (false, 0, 0, 0); // uninitialized pool

        L = IUniswapV3Pool(pool).liquidity();
        if (L == 0) return (false, 0, 0, 0); // no in-range liquidity

        address t0 = IUniswapV3Pool(pool).token0();
        address t1 = IUniswapV3Pool(pool).token1();

        // Virtual reserves from v3 constant product reparameterization:
        // reserve0 ~= (L << 96) / sqrtP ; reserve1 ~= (L * sqrtP) >> 96
        uint256 res0 = (uint256(L) << 96) / uint256(sqrtPriceX96);
        uint256 res1 = (uint256(L) * uint256(sqrtPriceX96)) >> 96;

        if (tokenA == t0 && tokenB == t1) {
            return (true, res0, res1, L);
        } else if (tokenA == t1 && tokenB == t0) {
            return (true, res1, res0, L);
        } else {
            return (false, 0, 0, 0);
        }
    }

    // ======= IUniversalDexInterface (kept signatures) =======

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        // Backward-compatible: use the configured fee tier only
        address pool = IUniswapV3Factory(factory).getPool(tokenA, tokenB, fee);
        (bool ok, uint256 rA, uint256 rB,) = _virtualReserves(pool, tokenA, tokenB);
        if (!ok) return (0, 0);
        return (rA, rB);
    }

    function getPoolAddress(address tokenIn, address tokenOut) external view override returns (address) {
        return IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, fee);
    }

    function getDexType() external pure override returns (string memory) {
        return "UniswapV3";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V3";
    }

    function getPrice(address tokenIn, address tokenOut, uint256 amountIn) external view override returns (uint256) {
        // For UniswapV3, calculate price based on reserves
        (uint256 reserveIn, uint256 reserveOut) = this.getReserves(tokenIn, tokenOut);

        if (reserveIn == 0 || reserveOut == 0) {
            return 0;
        }

        // Simple price calculation based on reserves ratio
        // This is a simplified version - UniswapV3 has more complex pricing with concentrated liquidity
        return (amountIn * reserveOut) / reserveIn;
    }

    // ======= Internal math helpers =======
    function _isqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) >> 1;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) >> 1;
        }
        return y;
    }

    // ======= New, opt-in helpers (non-breaking additions) =======

    function getBestPool(address tokenA, address tokenB) external view returns (address bestPool, uint24 bestFee) {
        uint24[4] memory C = [uint24(100), uint24(500), uint24(3000), uint24(10000)];
        uint128 bestL;
        for (uint256 i = 0; i < C.length; i++) {
            address pool = IUniswapV3Factory(factory).getPool(tokenA, tokenB, C[i]);
            if (pool == address(0)) continue;
            (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(pool).slot0();
            if (sqrtPriceX96 == 0) continue;
            uint128 L = IUniswapV3Pool(pool).liquidity();
            if (L == 0) continue;
            if (L > bestL) { bestL = L; bestPool = pool; bestFee = C[i]; }
        }
    }

    function getReservesBestTier(address tokenA, address tokenB)
        external
        view
        returns (uint256 reserveA, uint256 reserveB, uint24 feeTier, address pool)
    {
        uint24[4] memory C = [uint24(100), uint24(500), uint24(3000), uint24(10000)];
        uint128 bestL;
        for (uint256 i = 0; i < C.length; i++) {
            address p = IUniswapV3Factory(factory).getPool(tokenA, tokenB, C[i]);
            (bool ok, uint256 rA, uint256 rB, uint128 L) = _virtualReserves(p, tokenA, tokenB);
            if (!ok) continue;
            if (L > bestL) {
                bestL = L;
                pool = p;
                feeTier = C[i];
                reserveA = rA;
                reserveB = rB;
            }
        }
    }

    function getQuote(address tokenIn, address tokenOut, uint256 amountIn)
        external
        returns (uint256 amountOut, uint24 feeTier, address pool)
    {
        address q = quoterV2;
        if (q == address(0) || amountIn == 0) {
            return (0, 0, address(0));
        }

        uint24[4] memory C = [uint24(100), uint24(500), uint24(3000), uint24(10000)];
        for (uint256 i = 0; i < C.length; i++) {
            address p = IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, C[i]);
            if (p == address(0)) continue;
            (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(p).slot0();
            if (sqrtPriceX96 == 0) continue;
            if (IUniswapV3Pool(p).liquidity() == 0) continue;

            IQuoterV2.QuoteExactInputSingleParams memory params = IQuoterV2.QuoteExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amountIn: amountIn,
                fee: C[i],
                sqrtPriceLimitX96: 0
            });

            try IQuoterV2(q).quoteExactInputSingle(params) returns (
                uint256 out,
                uint160 /*sqrtAfter*/,
                uint32 /*ticksCrossed*/,
                uint256 /*gasEstimate*/
            ) {
                if (out > amountOut) {
                    amountOut = out;
                    feeTier = C[i];
                    pool = p;
                }
            } catch {}
        }
    }

    /// @notice Exact-out quote using QuoterV2 across fee tiers; picks the lowest amountIn.
    function getQuoteExactOut(address tokenIn, address tokenOut, uint256 amountOut)
        external
        returns (uint256 amountIn, uint24 feeTier, address pool)
    {
        address q = quoterV2;
        if (q == address(0) || amountOut == 0) {
            return (0, 0, address(0));
        }

        uint256 bestIn = type(uint256).max;
        uint24[4] memory C = [uint24(100), uint24(500), uint24(3000), uint24(10000)];
        for (uint256 i = 0; i < C.length; i++) {
            address p = IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, C[i]);
            if (p == address(0)) continue;
            (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(p).slot0();
            if (sqrtPriceX96 == 0) continue;
            if (IUniswapV3Pool(p).liquidity() == 0) continue;

            IQuoterV2.QuoteExactOutputSingleParams memory params = IQuoterV2.QuoteExactOutputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                amount: amountOut,
                fee: C[i],
                sqrtPriceLimitX96: 0
            });

            try IQuoterV2(q).quoteExactOutputSingle(params) returns (
                uint256 inAmt,
                uint160 /*sqrtAfter*/,
                uint32 /*ticksCrossed*/,
                uint256 /*gasEstimate*/
            ) {
                if (inAmt < bestIn) {
                    bestIn = inAmt;
                    feeTier = C[i];
                    pool = p;
                }
            } catch {}
        }

        if (bestIn == type(uint256).max) {
            return (0, 0, address(0));
        }
        return (bestIn, feeTier, pool);
    }

    /// @notice Compute a sqrtPriceLimitX96 that corresponds to a slippage tolerance in bps around the current price.
    /// @dev For zeroForOne=true (price decreases), the limit is below current price: P* (1 - bps/1e4)^(1/2).
    ///      For zeroForOne=false (price increases), the limit is above current price: P* (1 + bps/1e4)^(1/2).
    function getSqrtPriceLimitForSlippage(
        address tokenIn,
        address tokenOut,
        uint24 feeTier,
        uint32 bps,
        bool zeroForOne
    ) external view returns (uint160 sqrtPriceLimitX96) {
        require(bps <= 10_000, "BPS_TOO_HIGH");
        address p = IUniswapV3Factory(factory).getPool(tokenIn, tokenOut, feeTier);
        require(p != address(0), "NO_POOL");
        (uint160 sqrtP,,,,,,) = IUniswapV3Pool(p).slot0();
        require(sqrtP != 0, "UNINITIALIZED");

        uint256 num = zeroForOne ? (10_000 - bps) : (10_000 + bps);
        // sqrt(num/10_000) = sqrt(num) / 100 (since sqrt(10_000)=100)
        uint256 factorNum = _isqrt(num);
        uint256 limit = (uint256(sqrtP) * factorNum) / 100;
        if (limit == 0) limit = 1; // avoid zero
        if (limit > type(uint160).max) limit = type(uint160).max;
        return uint160(limit);
    }
}
