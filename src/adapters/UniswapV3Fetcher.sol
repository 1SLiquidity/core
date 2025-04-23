// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IReserveFetcher.sol";

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
}

contract UniswapV3Fetcher is IReserveFetcher {
    address public pool;

    constructor(address _pool) {
        pool = _pool;
    }

    function getReserves(address tokenA, address tokenB) external view override returns (uint256 reserveA, uint256 reserveB) {
        address token0 = IUniswapV3Pool(pool).token0();
        address token1 = IUniswapV3Pool(pool).token1();
        uint256 balance0 = IERC20(token0).balanceOf(pool);
        uint256 balance1 = IERC20(token1).balanceOf(pool);

        if (tokenA == token0) {
            return (balance0, balance1);
        } else {
            return (balance1, balance0);
        }
    }
}