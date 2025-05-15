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

/**
 * @dev configurable fetcher for Uniswap V3 pools
 */
contract UniswapV3Fetcher is IUniversalDexInterface {
    address public factory;
    uint24 public fee;

    constructor(address _factory, uint24 _fee) {
        factory = _factory;
        fee = _fee;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        address pool = IUniswapV3Factory(factory).getPool(tokenA, tokenB, fee);
        if (pool == address(0)) {
            return (0, 0);
        }

        // Get pool data
        (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(pool).slot0();
        uint128 liquidity = IUniswapV3Pool(pool).liquidity();
        bool isToken0 = tokenA == IUniswapV3Pool(pool).token0();

        // Calculate virtual reserves
        uint256 sqrtPrice = uint256(sqrtPriceX96) * 1e9 / (1 << 96);
        uint256 reserve0 = uint256(liquidity) * 1e18 / sqrtPrice;
        uint256 reserve1 = uint256(liquidity) * sqrtPrice / 1e18;

        return isToken0 ? (reserve0, reserve1) : (reserve1, reserve0);
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
}
