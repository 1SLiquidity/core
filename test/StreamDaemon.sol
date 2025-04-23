// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console, StdAssertions} from "forge-std/Test.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";

contract streamDaemonTest is StreamDaemon {
    StreamDaemon public streamDaemon;

    function setUp() public {
        streamDaemon = new StreamDaemon();
    }

}
