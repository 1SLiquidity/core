// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "./TradePlacement.s.sol";

contract TradeCancel is TradePlacement {
    function run() override external {
        testCancelTrade();
        test_RevertWhen_CancellingNonExistentTrade();
        test_RevertWhen_CancellingOthersTrade();
    }

    function testCancelTrade() public {
        // First place a trade
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 448);

        // Record balances before trade
        uint256 startWethBalance = getTokenBalance(WETH, address(this));
        uint256 startUsdcBalance = getTokenBalance(USDC, address(this));

        console.log("Initial balances before trade:");
        console.log("WETH:", startWethBalance);
        console.log("USDC:", startUsdcBalance);

        approveToken(WETH, address(core), amountIn);

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            false, // isInstasettlable
            0.0005 ether // botGasAllowance
        );

        // Place trade
        core.placeTrade(tradeData);

        // Get trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[0];

        // Record balances before cancellation
        uint256 initialWethBalance = getTokenBalance(WETH, address(this));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(this));

        console.log("Balances after trade placement but before cancellation:");
        console.log("WETH:", initialWethBalance);
        console.log("USDC:", initialUsdcBalance);

        // Get trade details before cancellation
        (
            ,
            ,
            ,
            ,
            ,
            ,
            uint256 amountRemaining,
            ,
            uint256 realisedAmountOut,
            ,
            ,
            ,
            ,
            
        ) = core.trades(tradeId);

        // Cancel trade
        bool success = core._cancelTrade(tradeId);
        assertTrue(success, "Trade cancellation failed");

        // Verify balances after cancellation
        uint256 finalWethBalance = getTokenBalance(WETH, address(this));
        uint256 finalUsdcBalance = getTokenBalance(USDC, address(this));

        console.log("Final balances after cancellation:");
        console.log("WETH:", finalWethBalance);
        console.log("USDC:", finalUsdcBalance);

        // Verify exact balance changes
        assertEq(finalWethBalance, initialWethBalance + amountRemaining, "WETH not returned correctly");
        assertEq(finalUsdcBalance, initialUsdcBalance + realisedAmountOut, "USDC not returned correctly");

        // Verify trade is deleted
        (address owner,,,,,,,,,,,,,) = core.trades(tradeId);
        assertEq(owner, address(0), "Trade not deleted");
    }

    function test_RevertWhen_CancellingNonExistentTrade() public {
        vm.expectRevert("Trade does not exist");
        core._cancelTrade(999999);
    }

    function test_RevertWhen_CancellingOthersTrade() public {
        // First place a trade
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 448);

        approveToken(WETH, address(core), amountIn);

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            false, // isInstasettlable
            0.0005 ether // botGasAllowance
        );

        // Place trade
        core.placeTrade(tradeData);

        // Get trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[0];

        // Try to cancel as a different address
        vm.prank(address(0x123));
        vm.expectRevert("Only trade owner can cancel");
        core._cancelTrade(tradeId);
    }
}
