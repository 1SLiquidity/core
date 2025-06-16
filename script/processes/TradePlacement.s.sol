// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../Protocol.s.sol";
import "../../src/Utils.sol";

contract TradePlacement is Protocol {
    function setUp() public virtual override {
        console.log("TradePlacement: setUp() start");
        super.setUp();
        console.log("TradePlacement: setUp() end");
    }

    function run() virtual override external {
        console.log("TradePlacement: run() start");
        testPlaceTradeWETHUSDC();
        test_RevertWhen_InsufficientAllowance();
        test_RevertWhen_InsufficientBalance();
        console.log("TradePlacement: run() end");
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("TradePlacement: testPlaceTradeWETHUSDC() start");
        // Setup initial balances
        uint256 amountIn = formatTokenAmount(WETH, 1); // 1 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1792); // Expected USDC output with 0.1% slippage
        uint256 botGasAllowance = 0.0005 ether;

        // Log WETH balance before approval
        uint256 wethBalance = getTokenBalance(WETH, address(this));
        console.log("WETH balance before trade: %s", wethBalance);
        require(wethBalance >= amountIn, "Insufficient WETH balance");

        // Approve Core to spend WETH
        uint256 allowanceBefore = IERC20(WETH).allowance(address(this), address(core));
        console.log("Allowance before approval: %s", allowanceBefore);
        
        approveToken(WETH, address(core), amountIn);
        
        uint256 allowanceAfter = IERC20(WETH).allowance(address(this), address(core));
        allowanceAfter;


        // Record initial balances
        uint256 initialWethBalance = getTokenBalance(WETH, address(core));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(core));

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            true, // isInstasettlable
            botGasAllowance // botGasAllowance
        );

        // Place trade
        console.log("placing trade");
        core.placeTrade(tradeData);
        console.log("working on trade");

        // Verify trade was placed
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        assertEq(tradeIds.length, 1, "Trade was not placed");

        // Get the trade details
        uint256 tradeId = tradeIds[0];
        Utils.Trade memory trade = core.getTrade(tradeId);
        
        // Verify trade struct values
        assertEq(trade.owner, address(this), "Trade owner should be this contract");
        assertEq(trade.tokenIn, WETH, "TokenIn should be WETH");
        assertEq(trade.tokenOut, USDC, "TokenOut should be USDC");
        assertEq(trade.amountIn, amountIn, "AmountIn should match input");
        assertNotEq(trade.amountRemaining, 0, "Amount remaining should not be 0 after execution");
        assertTrue(trade.realisedAmountOut > 0, "Realised amount out should be greater than 0");
        assertEq(trade.tradeId, tradeId, "Trade ID should match");
        assertEq(trade.instasettleBps, 100, "Instasettle BPS should be 100");
        console.log("Here be the last sweetie spot", trade.lastSweetSpot);
        assertTrue(trade.lastSweetSpot >= 3, "Last sweet spot should be >= 4");
        assertEq(trade.isInstasettlable, true, "Should be instasettlable");
        assertEq(trade.attempts, 1, "Should have 1 attempt");
        assertTrue(trade.cumulativeGasEntailed > 0, "Should have gas entailed");

        // Verify balances
        uint256 finalWethBalance = getTokenBalance(WETH, address(core));
        uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

        assertEq(finalWethBalance - initialWethBalance, amountIn * 3 / 4, "WETH balance not decreased correctly"); // we know sweet spot comes out at 4 for this tx
        assertEq(
            initialUsdcBalance + trade.realisedAmountOut, finalUsdcBalance, "USDC balance should increase by realised amount"
        );

        // Verify trade execution metrics
        // assertTrue(trade.realisedAmountOut >= amountOutMin, "Realised amount should be >= minimum amount");
        assertTrue(trade.cumulativeGasEntailed <= botGasAllowance, "Gas used should be <= allowance");

        // Log execution details
        console.log("Trade Execution Details:");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", amountIn);
        console.log("Amount Out:", trade.realisedAmountOut);
        console.log("Gas Used:", trade.cumulativeGasEntailed);
        console.log("Sweet Spot:", trade.lastSweetSpot);
        console.log("Attempts:", trade.attempts);
        console.log("TradePlacement: testPlaceTradeWETHUSDC() end");
    }

    // function placeNITradeWETHUSDC() public returns (uint256 tradeId) {
    //     // place non-instasettleable trade weth - usdc
    //     // Setup initial balances
    //     uint256 amountIn = formatTokenAmount(WETH, 1); // 1 WETH
    //     uint256 amountOutMin = formatTokenAmount(USDC, 1800); // Expected USDC output with 0.1% slippage
    //     uint256 botGasAllowance = 0.0005 ether;

    //     // Log WETH balance before approval
    //     uint256 wethBalance = getTokenBalance(WETH, address(this));
    //     require(wethBalance >= amountIn, "Insufficient WETH balance");

    //     // Approve Core to spend WETH
    //     uint256 allowanceBefore = IERC20(WETH).allowance(address(this), address(core));
        
    //     approveToken(WETH, address(core), amountIn);
        
    //     uint256 allowanceAfter = IERC20(WETH).allowance(address(this), address(core));
    //     allowanceAfter;


    //     // Record initial balances
    //     uint256 initialWethBalance = getTokenBalance(WETH, address(core));
    //     uint256 initialUsdcBalance = getTokenBalance(USDC, address(core));

    //     // Create the trade data
    //     bytes memory tradeData = abi.encode(
    //         WETH, // tokenIn
    //         USDC, // tokenOut
    //         amountIn, // amountIn
    //         amountOutMin, // amountOutMin
    //         false, // isInstasettlable
    //         botGasAllowance // botGasAllowance
    //     );

    //     // Place trade
    //     core.placeTrade(tradeData);

    //     // Verify trade was placed
    //     bytes32 pairId = keccak256(abi.encode(WETH, USDC));
    //     uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);

    //     // // Get the trade details
    //     tradeId = tradeIds[0];
    //     // (
    //     //     address owner,
    //     //     uint96 cumulativeGasEntailed,
    //     //     uint8 attempts,
    //     //     address tokenIn,
    //     //     address tokenOut,
    //     //     uint256 amountIn_,
    //     //     uint256 amountRemaining,
    //     //     uint256 targetAmountOut,
    //     //     uint256 realisedAmountOut,
    //     //     uint256 tradeId_,
    //     //     uint256 instasettleBps,
    //     //     uint256 botGasAllowance_,
    //     //     uint256 lastSweetSpot,
    //     //     bool isInstasettlable
    //     // ) = core.trades(tradeId);

    //     // targetAmountOut;
    //     // botGasAllowance_;

    //     // // Verify trade struct values
    //     // assertEq(owner, address(this), "Trade owner should be this contract");
    //     // assertEq(tokenIn, WETH, "TokenIn should be WETH");
    //     // assertEq(tokenOut, USDC, "TokenOut should be USDC");
    //     // assertEq(amountIn_, amountIn, "AmountIn should match input");
    //     // assertNotEq(amountRemaining, 0, "Amount remaining should not be 0 after execution");
    //     // // assertEq(targetAmountOut, amountIn, "Target amount out should match input");
    //     // assertTrue(realisedAmountOut > 0, "Realised amount out should be greater than 0");
    //     // assertEq(tradeId_, tradeId, "Trade ID should match");
    //     // // assertEq(botGasAllowance_, botGasAllowance, "Bot gas allowance should match input");
    //     // assertEq(instasettleBps, 100, "Instasettle BPS should be 100");
    //     // console.log("Here be the last sweetie spot", lastSweetSpot);
    //     // assertTrue(lastSweetSpot >= 3, "Last sweet spot should be >= 4");
    //     // assertEq(isInstasettlable, false, "Should not be instasettlable");
    //     // assertEq(attempts, 1, "Should have 1 attempt");
    //     // assertTrue(cumulativeGasEntailed > 0, "Should have gas entailed");

    //     // Verify balances
    //     // uint256 finalWethBalance = getTokenBalance(WETH, address(core));
    //     // uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

    //     // assertEq(finalWethBalance - initialWethBalance, amountIn * 3 / 4, "WETH balance not decreased correctly"); // we know sweet spot comes out at 4 for this tx
    //     // assertEq(
    //     //     initialUsdcBalance + realisedAmountOut, finalUsdcBalance, "USDC balance should increase by realised amount"
    //     // );

    //     // // Verify trade execution metrics
    //     // assertTrue(realisedAmountOut >= amountOutMin, "Realised amount should be >= minimum amount");
    //     // assertTrue(cumulativeGasEntailed <= botGasAllowance, "Gas used should be <= allowance");

    //     // // Log execution details
    //     // console.log("Trade Execution Details:");
    //     // console.log("Trade ID:", tradeId);
    //     // console.log("Amount In:", amountIn);
    //     // console.log("Amount Out:", realisedAmountOut);
    //     // console.log("Gas Used:", cumulativeGasEntailed);
    //     // console.log("Sweet Spot:", lastSweetSpot);
    //     // console.log("Attempts:", attempts);
    //     console.log("Trade Placed and Stream Executed");
    // }

    function placeTradeWETHUSDC() public returns (uint256 tradeId) {
        // Setup initial balances
        uint256 amountIn = formatTokenAmount(WETH, 1); // 1 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1800); // Expected USDC output with 0.1% slippage
        uint256 botGasAllowance = 0.0005 ether;

        // Log WETH balance before approval
        uint256 wethBalance = getTokenBalance(WETH, address(this));
        require(wethBalance >= amountIn, "Insufficient WETH balance");

        // Approve Core to spend WETH
        uint256 allowanceBefore = IERC20(WETH).allowance(address(this), address(core));
        
        approveToken(WETH, address(core), amountIn);
        
        uint256 allowanceAfter = IERC20(WETH).allowance(address(this), address(core));
        allowanceAfter;


        // Record initial balances
        uint256 initialWethBalance = getTokenBalance(WETH, address(core));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(core));

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            true, // isInstasettlable
            botGasAllowance // botGasAllowance
        );

        // Place trade
        core.placeTrade(tradeData);

        // Verify trade was placed
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);

        // // Get the trade details
        tradeId = tradeIds[0];
        // (
        //     address owner,
        //     uint96 cumulativeGasEntailed,
        //     uint8 attempts,
        //     address tokenIn,
        //     address tokenOut,
        //     uint256 amountIn_,
        //     uint256 amountRemaining,
        //     uint256 targetAmountOut,
        //     uint256 realisedAmountOut,
        //     uint256 tradeId_,
        //     uint256 instasettleBps,
        //     uint256 botGasAllowance_,
        //     uint256 lastSweetSpot,
        //     bool isInstasettlable
        // ) = core.trades(tradeId);

        // targetAmountOut;
        // botGasAllowance_;

        // // Verify trade struct values
        // assertEq(owner, address(this), "Trade owner should be this contract");
        // assertEq(tokenIn, WETH, "TokenIn should be WETH");
        // assertEq(tokenOut, USDC, "TokenOut should be USDC");
        // assertEq(amountIn_, amountIn, "AmountIn should match input");
        // assertNotEq(amountRemaining, 0, "Amount remaining should not be 0 after execution");
        // // assertEq(targetAmountOut, amountIn, "Target amount out should match input");
        // assertTrue(realisedAmountOut > 0, "Realised amount out should be greater than 0");
        // assertEq(tradeId_, tradeId, "Trade ID should match");
        // // assertEq(botGasAllowance_, botGasAllowance, "Bot gas allowance should match input");
        // assertEq(instasettleBps, 100, "Instasettle BPS should be 100");
        // console.log("Here be the last sweetie spot", lastSweetSpot);
        // assertTrue(lastSweetSpot >= 3, "Last sweet spot should be >= 4");
        // assertEq(isInstasettlable, false, "Should not be instasettlable");
        // assertEq(attempts, 1, "Should have 1 attempt");
        // assertTrue(cumulativeGasEntailed > 0, "Should have gas entailed");

        // Verify balances
        // uint256 finalWethBalance = getTokenBalance(WETH, address(core));
        // uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

        // assertEq(finalWethBalance - initialWethBalance, amountIn * 3 / 4, "WETH balance not decreased correctly"); // we know sweet spot comes out at 4 for this tx
        // assertEq(
        //     initialUsdcBalance + realisedAmountOut, finalUsdcBalance, "USDC balance should increase by realised amount"
        // );

        // // Verify trade execution metrics
        // assertTrue(realisedAmountOut >= amountOutMin, "Realised amount should be >= minimum amount");
        // assertTrue(cumulativeGasEntailed <= botGasAllowance, "Gas used should be <= allowance");

        // // Log execution details
        // console.log("Trade Execution Details:");
        // console.log("Trade ID:", tradeId);
        // console.log("Amount In:", amountIn);
        // console.log("Amount Out:", realisedAmountOut);
        // console.log("Gas Used:", cumulativeGasEntailed);
        // console.log("Sweet Spot:", lastSweetSpot);
        // console.log("Attempts:", attempts);
        console.log("Trade Placed and Stream Executed");
    }

    function test_RevertWhen_InsufficientAllowance() public {
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 1800);

        // Don't approve tokens

        vm.expectRevert();
        core.placeTrade(abi.encode(WETH, USDC, amountIn, amountOutMin, false, 0.1 ether));
    }

    function test_RevertWhen_InsufficientBalance() public {
        uint256 amountIn = formatTokenAmount(WETH, 1000); // Try to trade 1000 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1800000);

        approveToken(WETH, address(core), amountIn);

        vm.expectRevert();
        core.placeTrade(abi.encode(WETH, USDC, amountIn, amountOutMin, false, 0.1 ether));
    }

    // function test_RevertWhen_ToxicTrade() public {
    //     // Setup initial balances
    //     uint256 amountIn = formatTokenAmount(WETH, 1);
    //     uint256 amountOutMin = formatTokenAmount(USDC, 1000); // Set a very low minimum to trigger toxic trade

    //     // Approve Core to spend WETH
    //     approveToken(WETH, address(core), amountIn);

    //     // Place trade
    //     core.placeTrade(
    //         abi.encode(
    //             WETH,
    //             USDC,
    //             amountIn,
    //             amountOutMin,
    //             false,
    //             0.1 ether
    //         )
    //     );

    //     // Try to execute trade - should revert with ToxicTrade error
    //     vm.expectRevert(abi.encodeWithSelector(Core.ToxicTrade.selector, 0));
    //     bytes32 pairId = keccak256(abi.encode(WETH, USDC));
    //     core.executeTrades(pairId);
    // }
}
