// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

interface IUniversalDexInterface {
    function getReserves(address tokenA, address tokenB) external view returns (uint256 reserveA, uint256 reserveB);
    function getPoolAddress(address tokenIn, address tokenOut) external view returns (address pool);
    function getDexType() external pure returns (string memory);
    function getDexVersion() external pure returns (string memory);
}
