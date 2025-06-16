// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../Protocol.s.sol";
import "../processes/TradePlacement.s.sol";

contract Instasettle is TradePlacement {
    function setUp() public override {
        console.log("Instasettle: setUp() start");
        super.setUp();
        // Fund this contract with WETH and USDC from the first test account
        vm.startPrank(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        deal(WETH, address(this), formatTokenAmount(WETH, 10));
        deal(USDC, address(this), formatTokenAmount(USDC, 10000));
        vm.stopPrank();
        
        // Approve core to spend USDC from this contract
        IERC20(USDC).approve(address(core), type(uint256).max);
        console.log("Instasettle: setUp() end");
    }

    function run() external override {
        console.log("Instasettle: run() start");
        test_Instasettle();
        test_RevertWhen_InsufficientSettlerBalance();
        test_RevertWhen_NonInstasettlableTrade();
        console.log("Instasettle: run() end");
    }

    function test_Instasettle() public {
        console.log("Instasettle: test_Instasettle() start");
        console.log("Starting test_Instasettle...");
        
        // Place a trade using inherited function
        console.log("Placing trade...");
        uint256 tradeId = super.placeTradeWETHUSDC();
        console.log("Trade placed with ID:", tradeId);

        // Get balances before settlement
        console.log("Getting initial balances...");
        uint256 settlerUsdcBefore = IERC20(USDC).balanceOf(address(this));
        uint256 settlerWethBefore = IERC20(WETH).balanceOf(address(this));
        uint256 ownerUsdcBefore = IERC20(USDC).balanceOf(address(this));
        uint256 ownerWethBefore = IERC20(WETH).balanceOf(address(this));
        
        console.log("Initial balances:");
        console.log("Settler USDC:", settlerUsdcBefore);
        console.log("Settler WETH:", settlerWethBefore);
        console.log("Owner USDC:", ownerUsdcBefore);
        console.log("Owner WETH:", ownerWethBefore);

        // Get trade details
        console.log("Getting trade details...");
        Utils.Trade memory trade = core.getTrade(tradeId);
        console.log("Trade details:");
        console.log("targetAmountOut:", trade.targetAmountOut);
        console.log("realisedAmountOut:", trade.realisedAmountOut);
        console.log("instasettleBps:", trade.instasettleBps);
        console.log("amountRemaining:", trade.amountRemaining);

        console.log("Calculating instasettle amounts...");
        
        // Calculate remaining amount out, handling the case where realisedAmountOut > targetAmountOut
        uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
        
        // Calculate instasettle amount based on remaining amount
        uint256 instasettleAmount = (trade.targetAmountOut * trade.instasettleBps) / 10000;
        
        // Calculate how much the settler should pay
        // targetAmountOut - (realisedAmountOut * (1 - instasettleBps/10000))
        uint256 settlerPayment = trade.targetAmountOut - ((trade.realisedAmountOut * (10000 - trade.instasettleBps)) / 10000);
        
        console.log("remainingAmountOut:", remainingAmountOut);
        console.log("instasettleAmount:", instasettleAmount);
        console.log("settlerPayment:", settlerPayment);

        // Instasettle the trade
        console.log("Executing instasettle...");
        vm.prank(address(this));
        core.instasettle(tradeId);
        console.log("Instasettle executed");

        // Get balances after settlement
        console.log("Getting final balances...");
        uint256 settlerUsdcAfter = IERC20(USDC).balanceOf(address(this));
        uint256 settlerWethAfter = IERC20(WETH).balanceOf(address(this));
        uint256 ownerUsdcAfter = IERC20(USDC).balanceOf(address(this));
        uint256 ownerWethAfter = IERC20(WETH).balanceOf(address(this));
        
        console.log("Final balances:");
        console.log("Settler USDC:", settlerUsdcAfter);
        console.log("Settler WETH:", settlerWethAfter);
        console.log("Owner USDC:", ownerUsdcAfter);
        console.log("Owner WETH:", ownerWethAfter);

        console.log("Verifying token transfers...");
        // Normal instasettle case
        console.log("Checking settler USDC transfer...");
        assertEq(
            settlerUsdcBefore - settlerUsdcAfter,
            settlerPayment,
            "Settler should pay targetAmountOut - (realisedAmountOut * (1 - instasettleBps/10000)) in USDC"
        );
        console.log("Checking settler WETH transfer...");
        assertEq(
            settlerWethAfter - settlerWethBefore,
            trade.amountRemaining,
            "Settler should receive remaining WETH"
        );
        console.log("Checking owner USDC transfer...");
        assertEq(
            ownerUsdcAfter - ownerUsdcBefore,
            trade.realisedAmountOut,
            "Owner should receive realisedAmountOut in USDC"
        );

        // Owner's WETH balance should be 0 after spending all WETH
        console.log("Checking owner WETH balance...");
        assertEq(
            ownerWethAfter,
            0,
            "Owner's WETH balance should be 0 after spending all WETH"
        );

        // Trade should be deleted
        console.log("Verifying trade deletion...");
        vm.expectRevert("Trade not found");
        core.getTrade(tradeId);
        console.log("Test completed successfully");
        console.log("Instasettle: test_Instasettle() end");
    }

    function test_RevertWhen_InsufficientSettlerBalance() public {
        // Fund this contract with more WETH for the test
        deal(WETH, address(this), 1 ether);

        // Place a trade using inherited function
        uint256 tradeId = super.placeTradeWETHUSDC();

        // Drain this contract's USDC balance
        uint256 balance = IERC20(USDC).balanceOf(address(this));
        IERC20(USDC).transfer(address(0xdead), balance);

        // Try to instasettle - should revert
        vm.startPrank(address(this));
        vm.expectRevert("ERC20: transfer amount exceeds balance");
        core.instasettle(tradeId);
        vm.stopPrank();
    }

    function test_RevertWhen_NonInstasettlableTrade() public {
        // Place a non-instasettlable trade
        uint256 tradeId = super.placeTradeWETHUSDC();

        // Modify trade to be non-instasettlable
        Utils.Trade memory trade = core.getTrade(tradeId);
        trade.instasettleBps = 0;
        vm.store(
            address(core),
            keccak256(abi.encode(tradeId, uint256(2))), // slot for trades mapping
            bytes32(abi.encode(trade))
        );

        // Try to instasettle - should revert
        vm.startPrank(address(this));
        vm.expectRevert("Trade not instasettlable");
        core.instasettle(tradeId);
        vm.stopPrank();
    }
}