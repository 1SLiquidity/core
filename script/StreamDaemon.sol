// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";

contract StreamDaemonScript is StreamDaemon {
    StreamDaemon public streamDaemon;

    function setUp() public {}

    function run() public {
    }
}
