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

        (uint160 sqrtPriceX96,,,uint16 observationCardinality,,,) = IUniswapV3Pool(pool).slot0();
        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();

        // Convert sqrtPriceX96 to reserves
        uint256 price = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) * 1e18 / (1 << 192);
        
        if (tokenA == token0) {
            return (observationCardinality, observationCardinality * price / 1e18);
        } else {
            return (observationCardinality * price / 1e18, observationCardinality);
        }
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
