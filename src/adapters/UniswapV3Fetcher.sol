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
    uint24[] public feeTiers;

    constructor(address _factory, uint24[] memory _feeTiers) {
        factory = _factory;
        for (uint256 i = 0; i < _feeTiers.length; i++) {
            feeTiers.push(_feeTiers[i]);
        }

        // If no fee tiers provided, use the default ones
        if (_feeTiers.length == 0) {
            feeTiers.push(500); // 0.05%
            feeTiers.push(3000); // 0.3%
            feeTiers.push(10000); // 1%
        }
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        uint256 highestLiquidity = 0;
        address bestPool;
        bool tokensInOrder = false;

        // Check all fee tiers to find the one with highest liquidity
        for (uint256 i = 0; i < feeTiers.length; i++) {
            address pool = IUniswapV3Factory(factory).getPool(tokenA, tokenB, feeTiers[i]);

            if (pool != address(0)) {
                uint128 liquidity = IUniswapV3Pool(pool).liquidity();

                if (liquidity > highestLiquidity) {
                    highestLiquidity = liquidity;
                    bestPool = pool;
                    tokensInOrder = (IUniswapV3Pool(pool).token0() == tokenA);
                }
            }
        }

        // @audit similar issue as sushiswap fetcher
        if (bestPool == address(0)) {
            return (0, 0);
        }

        // For v3, we need to approximate reserves based on liquidity and current price
        // This is a simplified approximation
        (uint160 sqrtPriceX96,,,,,,) = IUniswapV3Pool(bestPool).slot0();
        uint256 liquidity = highestLiquidity;

        // Check for zero price to avoid division by zero
        if (sqrtPriceX96 == 0) {
            return (0, 0);
        }

        // convert liquidity to approximated reserves
        // @audit his is a simplified calculation. doesn't account for concentrated liquidity
        if (tokensInOrder) {
            // For a more accurate calculation, we'd need to use the proper math from the V3 whitepaper @audit
            uint256 priceX96 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) / (1 << 96);
            // Add safety check for division by zero
            if (priceX96 == 0) {
                return (0, 0);
            }
            reserveA = liquidity / (priceX96 > (1 << 96) ? priceX96 / (1 << 96) : 1);
            reserveB = liquidity;
        } else {
            uint256 priceX96 = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) / (1 << 96);
            // Add safety check for division by zero
            if (priceX96 == 0) {
                return (0, 0);
            }
            reserveA = liquidity;
            reserveB = liquidity / (priceX96 > (1 << 96) ? priceX96 / (1 << 96) : 1);
        }

        return (reserveA, reserveB);
    }
}
