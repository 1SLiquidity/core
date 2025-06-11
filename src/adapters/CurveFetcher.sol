// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function balances(int128 i) external view returns (uint256);
}

contract CurveFetcher is IUniversalDexInterface {
    address public pool;

    constructor(address _pool) {
        pool = _pool;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        // @audit this is a simplified version. In reality, we need to map tokens to indices
        return (ICurvePool(pool).balances(0), ICurvePool(pool).balances(1));
    }

    function getPoolAddress(address tokenIn, address tokenOut) external view override returns (address) {
        return pool;
    }

    function getDexType() external pure override returns (string memory) {
        return "Curve";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V2";
    }
}
