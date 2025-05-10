// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Fees is Ownable{

    constructor() Ownable(msg.sender) {}

    mapping(address => mapping(address => uint256)) public botTokenBalance;

    function takeFees(address bot, address feeToken) public payable {
        botTokenBalance[bot][feeToken] += msg.value;
    }

    function withdrawFees(address bot, address feeToken) public {
        botTokenBalance[bot][feeToken] -= botTokenBalance[bot][feeToken];
        IERC20(feeToken).transfer(bot, botTokenBalance[bot][feeToken]);
    }
}
