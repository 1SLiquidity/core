// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Utils {
    struct Trade {
        address owner;
        uint256 tradeId;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountRemaining;
        uint256 targetAmountOut;
        uint256 realisedAmountOut;
        bool isInstasettlable;
        uint256 instasettleBps;
        uint256 botGasAllowance;
        uint96 cumulativeGasEntailed;
        uint8 attempts;
        bytes32 pairId; //keccak hash of tokenIn, tokenOut. questionable if needed here but in for good measure as it stands @audit
        uint256 lastSweetSpot;
        uint64 slippage; // set to 0 if no custom slippage
    }
}
