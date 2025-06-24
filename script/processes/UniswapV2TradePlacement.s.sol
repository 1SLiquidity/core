// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../SingleDexProtocol.s.sol";
import "../../src/Utils.sol";

contract UniswapV2TradePlacement is SingleDexProtocol {
    function setUp() public {
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        
        // set up protocol with only UniswapV2
        setUpSingleDex(address(uniswapV2Fetcher), UNISWAP_V2_ROUTER);

        vm.startPrank(WETH_WHALE);
        IERC20(WETH).transfer(address(this), 100 * 1e18); // 100 WETH
        vm.stopPrank();

        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(address(this), 200_000 * 1e6); // 200,000 USDC
        vm.stopPrank();

        IERC20(WETH).approve(address(core), type(uint256).max);
        IERC20(USDC).approve(address(core), type(uint256).max);
    }

    function run() external {
        testPlaceTradeWETHUSDC();
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("Starting UniswapV2 trade test");
        
        uint256 amountIn = formatTokenAmount(WETH, 1); // 1 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1792); // 100 USDC minimum output (lowered for testing)
        uint256 botGasAllowance = 0.0005 ether;

        uint256 initialWethBalance = getTokenBalance(WETH, address(core));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(core));

        IERC20(WETH).approve(address(core), amountIn);

        console.log("Placing trade on UniswapV2");
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
            uint256 targetAmountOut,
            uint256 realisedAmountOut,
            uint256 tradeId_,
            uint256 instasettleBps,
            uint256 botGasAllowance_,
            uint256 lastSweetSpot,
            bool isInstasettlable
        ) = core.trades(tradeId);

        assertEq(owner, address(this), "Trade owner should be this contract");
        assertEq(tokenIn, WETH, "TokenIn should be WETH");
        assertEq(tokenOut, USDC, "TokenOut should be USDC");
        assertEq(amountIn_, amountIn, "AmountIn should match input");
        assertNotEq(amountRemaining, 0, "Amount remaining should not be 0 after execution");
        assertEq(instasettleBps, 100, "Instasettle BPS should be 100");
        assertTrue(lastSweetSpot >= 0, "Last sweet spot should be >= 0");
        assertEq(isInstasettlable, false, "Should not be instasettlable");
        assertEq(attempts, 1, "Should have 1 attempt");
        assertTrue(cumulativeGasEntailed > 0, "Should have gas entailed");

        uint256 finalWethBalance = getTokenBalance(WETH, address(core));
        uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

        assertEq(finalWethBalance, amountIn * 3 / 4, "WETH balance should match input with sweet spot");
        assertTrue(finalUsdcBalance > 0, "USDC balance should be greater than 0 after trade execution");

        console.log("Trade Execution Details:");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", amountIn);
        console.log("Amount Out:", realisedAmountOut);
        console.log("Gas Used:", cumulativeGasEntailed);
        console.log("Sweet Spot:", lastSweetSpot);
        console.log("Attempts:", attempts);
    }
} 