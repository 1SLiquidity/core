// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Test } from "forge-std/Test.sol";

/// @notice Common logic needed by all fork tests.
abstract contract Fork_Test is Test {
    function setUp() public virtual {
        // Fork Polygon Mainnet at a specific block number.
        vm.createSelectFork({ blockNumber: 1_000_000, urlOrAlias: "mainnet" });
    }
}
