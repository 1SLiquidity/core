// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../SingleDexProtocol.s.sol";
import "../../src/Utils.sol";
import "../../src/adapters/UniswapV3Fetcher.sol";

contract UniswapV3TradePlacement is SingleDexProtocol {
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    uint24 constant UNISWAP_V3_FEE = 3000; // 0.3% fee tier

    function setUp() public {
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, UNISWAP_V3_FEE);
        setUpSingleDex(address(uniswapV3Fetcher), UNISWAP_V3_ROUTER);
    }

    function run() external {
        testPlaceTradeWETHUSDC();
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("Starting UniswapV3 trade test");
        
        uint256 amountIn = formatTokenAmount(WETH, 33); // 1 WETH
        uint256 amountOutMin = formatTokenAmount(USDC, 1800); // 1800 USDC
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
            uint256 cumulativeGasEntailed,
            uint256 attempts,
            address tokenIn,
            address tokenOut,
            uint256 amountIn_,
            uint256 amountRemaining,
            uint256 realisedAmountOut,
            uint256 lastSweetSpot,
            uint256 lastExecutionTime,
            uint256 instasettleBps,
            uint256 botGasAllowance_,
            uint256 lastDexIndex,
            bool isInstasettlable
        ) = core.trades(tradeId);

        assertEq(owner, address(this), "Trade owner should be this");
        assertEq(tokenIn, WETH, "tokenIn should be WETH");
        assertEq(tokenOut, USDC, "okenOut should be USDC");
        assertEq(amountIn_, amountIn, "amountIn should match input");
        assertNotEq(amountRemaining, 0, "amount remaining should not be 0 after execution");
        assertEq(instasettleBps, 100, "instasettle BPS should be 100");
        assertTrue(lastDexIndex >= 0, "Last DEX index should be > = 0");
        assertEq(isInstasettlable, false, "sould not be instasettlable");
        assertEq(attempts, 1, "ahould have 1 attempt");
        assertTrue(cumulativeGasEntailed > 0, "Should have gas entailed");

        uint256 finalWethBalance = getTokenBalance(WETH, address(core));
        uint256 finalUsdcBalance = getTokenBalance(USDC, address(core));

        assertEq(finalWethBalance, amountIn, "WETH balance should match input");
        assertEq(finalUsdcBalance, 0, "USDC balance should be 0 initially");

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