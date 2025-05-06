// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface IBalancerVault {
    function getPoolTokens(bytes32 poolId) external view returns (address[] memory, uint256[] memory, uint256);
}

interface IBalancerPool {
    function getPoolId() external view returns (bytes32);
}

contract BalancerFetcher is IUniversalDexInterface {
    address public pool;
    address public vault;

    constructor(address _pool, address _vault) {
        pool = _pool;
        vault = _vault;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        bytes32 poolId = IBalancerPool(pool).getPoolId();
        (address[] memory tokens, uint256[] memory balances,) = IBalancerVault(vault).getPoolTokens(poolId);

        uint256 indexA = 0;
        uint256 indexB = 1;

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == tokenA) indexA = i;
            if (tokens[i] == tokenB) indexB = i;
        }

        return (balances[indexA], balances[indexB]);
    }
}
