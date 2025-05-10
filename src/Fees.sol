// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Fees is Ownable{
    /**
     * this contract is meant to collect fees on behalf of Bots (maintainters of the protocol)
     * 
     * each time a tx is executed, 10BPS are taken from amountOut (realised trade output) and stored 
     * as a balance in this contract
     * 
     * as such, we erequire a mixture of state and fucntions:
     * 
     * INHERITANCE
     * 
     * must be able to recieve tokens
     * 
     * STATE
     * 
     * balances mapping
     * 
     * FUNCTIONS
     * 
     * (fallback and recieve functions may be implemented to be defined with logic that calls: )
     * takeFees(bot)
     * 
     * withdrawFees (not automatically called in first implementation, but automatically called when transactions are batched)
     */

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
