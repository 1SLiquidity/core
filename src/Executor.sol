// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import {StreamDaemon} from "./StreamDaemon.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract Executor {
    // StreamDaemon public streamDaemon;
    constructor(address _streamDaemon) {
        // streamDaemon = StreamDaemon(_streamDaemon);
    }

    function compileTrade(bytes calldata trade) internal returns (uint256) {
        // here, we compile a trade for the given DEX
    }
}
