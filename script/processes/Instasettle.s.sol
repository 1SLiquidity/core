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
        uint256 tradeId = placeTradeWETHUSDC(true);
        console.log("Trade placed with ID:", tradeId);

        // Define addresses
        address tradeOwner = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        address settler = address(this);

        // Get balances before settlement
        console.log("Getting initial balances...");
        uint256 settlerUsdcBefore = IERC20(USDC).balanceOf(settler);
        uint256 settlerWethBefore = IERC20(WETH).balanceOf(settler);
        uint256 ownerUsdcBefore = IERC20(USDC).balanceOf(tradeOwner);
        uint256 coreWethBefore = IERC20(WETH).balanceOf(address(core));
        
        console.log("Initial balances:");
        console.log("Settler USDC before:", settlerUsdcBefore);
        console.log("Settler WETH before:", settlerWethBefore);
        console.log("Owner USDC before:", ownerUsdcBefore);
        console.log("Core WETH before:", coreWethBefore);

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
        uint256 instasettleAmount = (remainingAmountOut * (10000 - trade.instasettleBps)) / 10000;
        
        // Calculate how much the settler should pay (match contract logic)
        uint256 settlerPayment = ((trade.targetAmountOut - trade.realisedAmountOut) * (10000 - trade.instasettleBps)) / 10000;
        
        console.log("remainingAmountOut:", remainingAmountOut);
        console.log("instasettleAmount:", instasettleAmount);
        console.log("settlerPayment:", settlerPayment);

        // Instasettle the trade
        console.log("Executing instasettle...");
        vm.prank(settler);
        core.instasettle(tradeId);
        console.log("Instasettle executed");

        // Get balances after settlement
        console.log("Getting final balances...");
        uint256 settlerUsdcAfter = IERC20(USDC).balanceOf(settler);
        uint256 settlerWethAfter = IERC20(WETH).balanceOf(settler);
        uint256 ownerUsdcAfter = IERC20(USDC).balanceOf(tradeOwner);
        uint256 coreWethAfter = IERC20(WETH).balanceOf(address(core));
        
        console.log("Final balances:");
        console.log("Settler USDC after:", settlerUsdcAfter);
        console.log("Settler WETH after:", settlerWethAfter);
        console.log("Owner USDC after:", ownerUsdcAfter);
        console.log("Core WETH after:", coreWethAfter);

        console.log("Verifying token transfers...");
        // Normal instasettle case
        console.log("Checking settler USDC transfer...");
        assertEq(
            settlerUsdcBefore - settlerUsdcAfter,
            settlerPayment,
            "Settler should pay settler payment amount"
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
            settlerPayment,
            "Owner should receive settler payment in USDC"
        );

        // Core's WETH balance should be reduced by the amount transferred to settler
        console.log("Checking Core WETH balance...");
        assertEq(
            coreWethBefore - coreWethAfter,
            trade.amountRemaining,
            "Core's WETH balance should be reduced by the amount transferred to settler"
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
        uint256 tradeId = placeTradeWETHUSDC(true);

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
        uint256 tradeId = placeTradeWETHUSDC(false);

        // Modify trade to be non-instasettlable
        Utils.Trade memory trade = core.getTrade(tradeId);
        trade.isInstasettlable = false;
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

    function placeTradeWETHUSDC(bool isInstasettlable) public override returns (uint256 tradeId) {
        // Use a different address as the trade owner to avoid self-transfer issues
        address tradeOwner = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // Hardhat account #1
        
        // Fund the trade owner with WETH
        vm.startPrank(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        deal(WETH, tradeOwner, formatTokenAmount(WETH, 10));
        vm.stopPrank();
        
        // Switch to trade owner context
        vm.startPrank(tradeOwner);
        
        // Setup initial balances
        uint256 amountIn = formatTokenAmount(WETH, 1); // 1 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1800); // Expected USDC output with 0.1% slippage
        uint256 botGasAllowance = 0.0005 ether;

        // Log WETH balance before approval
        uint256 wethBalance = getTokenBalance(WETH, tradeOwner);
        require(wethBalance >= amountIn, "Insufficient WETH balance");

        // Approve Core to spend WETH
        approveToken(WETH, address(core), amountIn);

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            isInstasettlable, // isInstasettlable
            botGasAllowance // botGasAllowance
        );

        // Place trade
        core.placeTrade(tradeData);

        // Verify trade was placed
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        tradeId = tradeIds[0];
        
        vm.stopPrank();
        
        console.log("Trade Placed and Stream Executed");
        return tradeId;
    }
}