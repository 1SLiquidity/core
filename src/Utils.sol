// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

library Utils {
    struct Trade {
        address owner; //c
        uint8 attempts; //v
        address tokenIn; //c
        address tokenOut; //c
        uint256 amountIn; //c
        uint256 amountRemaining; //v
        uint256 targetAmountOut; //c
        uint256 realisedAmountOut; //v
        uint256 tradeId; //c
        uint256 instasettleBps; //c
        uint256 lastSweetSpot; //v
        bool isInstasettlable; //c
    }
}
