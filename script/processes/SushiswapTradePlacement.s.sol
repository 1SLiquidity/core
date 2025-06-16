// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../SingleDexProtocol.s.sol";
import "../../src/Utils.sol";

contract SushiswapTradePlacement is SingleDexProtocol {
    function setUp() public {
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);
        setUpSingleDex(address(sushiswapFetcher), SUSHISWAP_ROUTER);
        vm.startPrank(WETH_WHALE);
        IERC20(WETH).transfer(address(this), 100 * 1e18); 
        vm.stopPrank();

        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(address(this), 200_000 * 1e6); 
        vm.stopPrank();

        IERC20(WETH).approve(address(core), type(uint256).max);
        IERC20(USDC).approve(address(core), type(uint256).max);
    }

    function run() external {
        testPlaceTradeWETHUSDC();
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("Starting Sushiswap trade test");
        
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 1792); // (lowered for testing)
        uint256 botGasAllowance = 0.0005 ether;

        uint256 initialWethBalance = getTokenBalance(WETH, address(core));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(core));

        IERC20(WETH).approve(address(core), amountIn);

        uint256 wethBalanceBefore = getTokenBalance(WETH, address(core));
        uint256 usdcBalanceBefore = getTokenBalance(USDC, address(core));

        console.log("Placing trade on Sushiswap");
        bytes memory tradeData = abi.encode(
            WETH,
            USDC,
            amountIn,
            amountOutMin,
            false,
            botGasAllowance
        );
        core.placeTrade(tradeData);
        console.log("Working on trade");

        uint256 tradeId = 0; // First trade should have ID 0

        (
            address owner,
            uint96 cumulativeGasEntailed,
            uint8 attempts,
            address tokenIn,
            address tokenOut,
            uint256 amountIn_,
            uint256 amountRemaining,
            ,  // targetAmountOut
            uint256 realisedAmountOut,
            ,  // tradeId_
            uint256 instasettleBps,
            ,  // botGasAllowance_
            uint256 lastSweetSpot,
            bool isInstasettlable
        ) = core.trades(tradeId);

        assertEq(owner, address(this), "Trade owner should be this contract");
        assertEq(tokenIn, WETH, "TokenIn should be WETH");
        assertEq(tokenOut, USDC, "TokenOut should be USDC");
        assertEq(amountIn_, amountIn, "AmountIn should match input");
        assertNotEq(amountRemaining, 0, "Amount remaining should not be 0 after execution");
        assertEq(instasettleBps, 100, "Instasettle BPS should be 100");
        assertEq(isInstasettlable, false, "Should not be instasettlable");
        assertEq(attempts, 1, "Should have 1 attempt");
        assertTrue(cumulativeGasEntailed > 0, "Should have gas entailed");

        uint256 finalWethBalance = getTokenBalance(WETH, address(core));
        uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

        assertEq(finalWethBalance, amountIn * 3 / 4, "WETH balance should match input with sweet spot");
        assertEq(finalUsdcBalance, 448824323, "USDC balance should match realised amount");

        console.log("\nSushiswap Trade Execution Details:");
        console.log("----------------------------------------");
        console.log("Trade ID:", tradeId);
        console.log("WETH Input Amount:", amountIn);
        console.log("USDC Output Amount:", realisedAmountOut);
        console.log("Gas Used:", cumulativeGasEntailed);
        console.log("Sweet Spot:", lastSweetSpot);
        console.log("Attempts:", attempts);
        console.log("----------------------------------------");
        console.log("Initial WETH Balance:", initialWethBalance);
        console.log("Final WETH Balance:", finalWethBalance);
        console.log("Initial USDC Balance:", initialUsdcBalance);
        console.log("Final USDC Balance:", finalUsdcBalance);
        console.log("WETH Remaining:", amountRemaining);
        console.log("----------------------------------------\n");
    }
} 