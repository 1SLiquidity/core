// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Fees is Ownable {
    using SafeERC20 for IERC20;

    constructor() Ownable(msg.sender) { }

    event FeesClaimed(address indexed bot, address indexed feeToken, uint256 amount);

    uint256 public BOT_FEE = 10; // 10 BPS
    uint256 public PROTOCOL_FEE = 20; // 20 BPS

    mapping(address => mapping(address => uint256)) public botTokenBalance;

    function getBotFeeQuote(uint256 amountIn) public view returns (uint256 approx) {
        return amountIn * 100_000 * BOT_FEE / 100_000;
    }

    function getProtocolFeeQuote(uint256 amountIn) public view returns (uint256 approx) {
        return amountIn * 100_000 * PROTOCOL_FEE / 100_000;
    }

    function takeFees(address bot, address feeToken) public payable {
        botTokenBalance[bot][feeToken] += msg.value;
    }

    function withdrawFees(address bot, address feeToken) public {
        uint256 amount = botTokenBalance[bot][feeToken];
        botTokenBalance[bot][feeToken] = 0;
        IERC20(feeToken).safeTransfer(bot, amount);
        emit FeesClaimed(bot, feeToken, amount);
    }
}
