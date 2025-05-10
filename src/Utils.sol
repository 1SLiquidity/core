// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Utils {
    struct Trade {
        address owner;
        uint256 tradeId;
        uint256 botAllocation;
        address tokenIn;
        address tokenOut;
        bytes32 pairId;
        uint128 targetAmountOut;
        uint128 realisedAmountOut;
        uint96 cumulativeGasEntailed;
        bool isInstasettlable;
        uint64 slippage; // set to 0 if no custom slippage
        uint64 botGasAllowance;
        uint8 attempts;
    }
}
