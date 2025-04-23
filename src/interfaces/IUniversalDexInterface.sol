// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUniversalDexInterface {
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB);
} 