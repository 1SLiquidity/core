// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {StreamDaemon} from "./StreamDaemon.sol";
import {IERC20} from "lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract Executor {

    StreamDaemon public streamDaemon;

    uint256 public gasConsumption;  
    uint256 public lastCachedTimestamp;
    uint256 public constant CACHE_DURATION = 30 seconds;

    constructor(address _streamDaemon) {
        streamDaemon = StreamDaemon(_streamDaemon);
    }

    function _updateGasStats(uint256 startGas, uint256 endGas) internal {
        uint256 currentGasUsed = startGas - endGas;
        if (gasConsumption == 0) {
            gasConsumption = currentGasUsed;
        } else {
            gasConsumption = (gasConsumption + currentGasUsed) / 2; // TODO needs proper implementation as TWAP algo
        }
    }

    function readGasCache() internal view returns (uint256) {
        return gasConsumption * tx.gasprice;
    }

    function compileTrade(bytes calldata trade) internal returns (uint256) {
    }

}