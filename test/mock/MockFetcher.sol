// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "src/interfaces/IUniversalDexInterface.sol";

abstract contract AMockFetcher is IUniversalDexInterface {
    function getReserves(
        address tokenA,
        address tokenB
    )
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        // to implement
        return (0, 0);
    }

    function getPoolAddress(address, address) external pure override returns (address) {
        return address(0);
    }
}

contract MockFetcher1 is AMockFetcher {
    function getDexType() external pure override returns (string memory) {
        return "Mock2";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V1";
    }
}

contract MockFetcher2 is AMockFetcher {
    function getDexType() external pure override returns (string memory) {
        return "Mock2";
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V2";
    }
}
