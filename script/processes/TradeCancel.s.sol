// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../Protocol.s.sol";

contract TradeCancel is Protocol {
// function setUp() public override {
//     super.setUp();
// }

// function testCancelTrade() public {
//     // First place a trade
//     uint256 amountIn = formatTokenAmount(WETH, 1);
//     uint256 amountOutMin = formatTokenAmount(USDC, 1800);

//     approveToken(WETH, address(core), amountIn);

//     core.placeTrade(
//         WETH,
//         USDC,
//         amountIn,
//         amountOutMin,
//         false,
//         0.1 ether
//     );

//     // Get trade ID
//     bytes32 pairId = keccak256(abi.encode(WETH, USDC));
//     uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
//     uint256 tradeId = tradeIds[0];

//     // Record balances before cancellation
//     uint256 initialWethBalance = getTokenBalance(WETH, address(this));
//     uint256 initialUsdcBalance = getTokenBalance(USDC, address(this));

//     // Cancel trade
//     bool success = core.cancelTrade(tradeId);
//     assertTrue(success, "Trade cancellation failed");

//     // Verify balances after cancellation
//     uint256 finalWethBalance = getTokenBalance(WETH, address(this));
//     uint256 finalUsdcBalance = getTokenBalance(USDC, address(this));

//     assertEq(finalWethBalance, initialWethBalance + amountIn, "WETH not returned");
//     assertEq(finalUsdcBalance, initialUsdcBalance, "USDC balance changed unexpectedly");

//     // Verify trade is deleted
//     (address owner,,,,,,,,,,,,,,,) = core.trades(tradeId);
//     assertEq(owner, address(0), "Trade not deleted");
// }

// function testFailCancelNonExistentTrade() public {
//     bool success = core.cancelTrade(999999);
//     assertFalse(success, "Should not be able to cancel non-existent trade");
// }

// function testFailCancelOthersTrade() public {
//     // Place trade as this contract
//     uint256 amountIn = formatTokenAmount(WETH, 1);
//     uint256 amountOutMin = formatTokenAmount(USDC, 1800);

//     approveToken(WETH, address(core), amountIn);

//     core.placeTrade(
//         WETH,
//         USDC,
//         amountIn,
//         amountOutMin,
//         false,
//         0.1 ether
//     );

//     // Get trade ID
//     bytes32 pairId = keccak256(abi.encode(WETH, USDC));
//     uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
//     uint256 tradeId = tradeIds[0];

//     // Try to cancel as a different address
//     vm.prank(address(0x123));
//     bool success = core.cancelTrade(tradeId);
//     assertFalse(success, "Should not be able to cancel others trade");
// }
}
