// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../SingleDexProtocol.s.sol";
import "../../src/Utils.sol";
import "../../src/adapters/UniswapV3Fetcher.sol";

contract UniswapV3TradePlacement is SingleDexProtocol {
    function setUp() public {
        console.log("UniswapV3TradePlacement: Starting setup");
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, UNISWAP_V3_FEE);
        console.log("UniswapV3TradePlacement: Created fetcher at", address(uniswapV3Fetcher));
        setUpSingleDex(address(uniswapV3Fetcher), UNISWAP_V3_ROUTER);
        console.log("UniswapV3TradePlacement: Setup complete");
    }

    function run() external {
        testPlaceTradeWETHUSDC();
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("UniswapV3TradePlacement: Starting trade test");
        console.log("UniswapV3TradePlacement: Using fetcher at", dexFetcher);
        console.log("UniswapV3TradePlacement: Using router at", dexRouter);
        
        uint256 amountIn = formatTokenAmount(WETH, 33); // 1 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1792); // 1800 USDC
        uint256 botGasAllowance = 0.0005 ether;

        console.log("WETH balance before trade: %s", getTokenBalance(WETH, address(this)));

        approveToken(WETH, address(core), amountIn);

        uint256 initialWethBalance = getTokenBalance(WETH, address(core));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(core));

        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            false, // isInstasettlable
            botGasAllowance // botGasAllowance
        );

        console.log("Placing trade on UniswapV3");
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
            uint256 targetAmountOut,
            uint256 realisedAmountOut,
            uint256 tradeId_,
            uint256 instasettleBps,
            uint256 botGasAllowance_,
            uint256 lastSweetSpot,
            bool isInstasettlable
        ) = core.trades(tradeId);

        assertEq(owner, address(this), "Trade owner should be this");
        assertEq(tokenIn, WETH, "tokenIn should be WETH");
        assertEq(tokenOut, USDC, "okenOut should be USDC");
        assertEq(amountIn_, amountIn, "amountIn should match input");
        assertNotEq(amountRemaining, 0, "amount remaining should not be 0 after execution");
        assertEq(instasettleBps, 100, "instasettle BPS should be 100");
        assertTrue(lastSweetSpot >= 0, "Last Sweet Spot should be >= 0");
        assertEq(isInstasettlable, false, "sould not be instasettlable");
        assertEq(attempts, 1, "ahould have 1 attempt");
        assertTrue(cumulativeGasEntailed > 0, "Should have gas entailed");

        uint256 finalWethBalance = getTokenBalance(WETH, address(core));
        uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

        assertEq(finalWethBalance, amountIn * 3 / 4, "WETH balance should match input");

        // Log execution details
        console.log("Trade Execution Details:");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", amountIn);
        console.log("Amount Out:", realisedAmountOut);
        console.log("Gas Used:", cumulativeGasEntailed);
        console.log("Sweet Spot:", lastSweetSpot);
        console.log("Attempts:", attempts);
    }
} 