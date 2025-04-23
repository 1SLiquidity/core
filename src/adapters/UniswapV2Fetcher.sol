// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

contract UniswapV2Fetcher is IUniversalDexInterface {
    address public pair;

    constructor(address _pair) {
        pair = _pair;
    }

    function getReserves(address tokenA, address tokenB) external override view returns (uint256 reserveA, uint256 reserveB) {
        (uint112 reserve0, uint112 reserve1, ) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();
        if (tokenA == token0) {
            return (reserve0, reserve1);
        } else {
            return (reserve1, reserve0);
        }
    }
}