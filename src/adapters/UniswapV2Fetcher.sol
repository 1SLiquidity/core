// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract UniswapV2Fetcher is IUniversalDexInterface {
    address public factory;

    constructor(address _factory) {
        factory = _factory;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);

        // @audit revert or throw error
        if (pair == address(0)) {
            return (0, 0);
        }
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();

        if (tokenA == token0) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }
}
