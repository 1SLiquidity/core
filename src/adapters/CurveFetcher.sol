// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IReserveFetcher.sol";

interface ICurvePool {
    function coins(uint256 i) external view returns (address);
    function balances(uint256 i) external view returns (uint256);
}

contract CurveFetcher is IReserveFetcher {
    address public pool;

    constructor(address _pool) {
        pool = _pool;
    }

    function getReserves(address tokenA, address tokenB) external view override returns (uint256 reserveA, uint256 reserveB) {
        address token0 = ICurvePool(pool).coins(0);
        address token1 = ICurvePool(pool).coins(1);
        uint256 balance0 = ICurvePool(pool).balances(0);
        uint256 balance1 = ICurvePool(pool).balances(1);

        if (tokenA == token0) {
            return (balance0, balance1);
        } else {
            return (balance1, balance0);
        }
    }
}