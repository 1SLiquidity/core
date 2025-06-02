// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Test} from "forge-std/Test.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {UniswapV2Fetcher} from "../src/adapters/UniswapV2Fetcher.sol";
import {SushiswapFetcher} from "../src/adapters/SushiswapFetcher.sol";
import {UniswapV3Fetcher} from "../src/adapters/UniswapV3Fetcher.sol";
import {IUniversalDexInterface} from "../src/interfaces/IUniversalDexInterface.sol";

contract TestReservesScript is Script, Test {
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
    address constant WETH_WHALE = 0x2F0b23f53734252Bda2277357e97e1517d6B042A;

    StreamDaemon public streamDaemon;
    UniswapV2Fetcher public uniswapV2Fetcher;
    SushiswapFetcher public sushiSwapFetcher;
    UniswapV3Fetcher public uniswapV3Fetcher;

    function setUp() public {
        // Start impersonating the whale
        vm.startPrank(WETH_WHALE);

        // Deploy fetchers
        uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        sushiSwapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);
        uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 3000); // 0.3% fee tier

        // Deploy StreamDaemon with all fetchers
        address[] memory fetchers = new address[](3);
        fetchers[0] = address(uniswapV2Fetcher);
        fetchers[1] = address(sushiSwapFetcher);
        fetchers[2] = address(uniswapV3Fetcher);

        address[] memory routers = new address[](3); // shouldn't need to populate as isnt used in this suite

        streamDaemon = new StreamDaemon(fetchers, routers);

        vm.stopPrank();
    }

    function testUniswapV2Reserves() public {
        vm.startPrank(WETH_WHALE);

        // Test WETH-USDC pair
        (uint256 reserveIn, uint256 reserveOut) = uniswapV2Fetcher.getReserves(WETH, USDC);
        assertTrue(reserveIn > 0, "UniswapV2 WETH-USDC reserveIn should be > 0");
        assertTrue(reserveOut > 0, "UniswapV2 WETH-USDC reserveOut should be > 0");

        // Test WETH-WBTC pair
        (reserveIn, reserveOut) = uniswapV2Fetcher.getReserves(WETH, WBTC);
        assertTrue(reserveIn > 0, "UniswapV2 WETH-WBTC reserveIn should be > 0");
        assertTrue(reserveOut > 0, "UniswapV2 WETH-WBTC reserveOut should be > 0");

        vm.stopPrank();
    }

    function testSushiSwapReserves() public {
        vm.startPrank(WETH_WHALE);

        // Test WETH-USDC pair
        (uint256 reserveIn, uint256 reserveOut) = sushiSwapFetcher.getReserves(WETH, USDC);
        assertTrue(reserveIn > 0, "SushiSwap WETH-USDC reserveIn should be > 0");
        assertTrue(reserveOut > 0, "SushiSwap WETH-USDC reserveOut should be > 0");

        // Test WETH-WBTC pair
        (reserveIn, reserveOut) = sushiSwapFetcher.getReserves(WETH, WBTC);
        assertTrue(reserveIn > 0, "SushiSwap WETH-WBTC reserveIn should be > 0");
        assertTrue(reserveOut > 0, "SushiSwap WETH-WBTC reserveOut should be > 0");

        vm.stopPrank();
    }

    function testUniswapV3Reserves() public {
        vm.startPrank(WETH_WHALE);

        // Test WETH-USDC pair
        (uint256 reserveIn, uint256 reserveOut) = uniswapV3Fetcher.getReserves(WETH, USDC);
        assertTrue(reserveIn > 0, "UniswapV3 WETH-USDC reserveIn should be > 0");
        assertTrue(reserveOut > 0, "UniswapV3 WETH-USDC reserveOut should be > 0");

        // Test WETH-WBTC pair
        (reserveIn, reserveOut) = uniswapV3Fetcher.getReserves(WETH, WBTC);
        assertTrue(reserveIn > 0, "UniswapV3 WETH-WBTC reserveIn should be > 0");
        assertTrue(reserveOut > 0, "UniswapV3 WETH-WBTC reserveOut should be > 0");

        vm.stopPrank();
    }

    function testStreamDaemonHighestReserves() public {
        vm.startPrank(WETH_WHALE);

        // Test WETH-USDC pair
        (address bestDex, uint256 maxReserveIn, uint256 maxReserveOut) =
            streamDaemon.findHighestReservesForTokenPair(WETH, USDC);
        assertTrue(bestDex != address(0), "Best DEX should not be zero address");
        assertTrue(maxReserveIn > 0, "Max reserve in should be > 0");
        assertTrue(maxReserveOut > 0, "Max reserve out should be > 0");

        // Test WETH-WBTC pair
        (bestDex, maxReserveIn, maxReserveOut) = streamDaemon.findHighestReservesForTokenPair(WETH, WBTC);
        assertTrue(bestDex != address(0), "Best DEX should not be zero address");
        assertTrue(maxReserveIn > 0, "Max reserve in should be > 0");
        assertTrue(maxReserveOut > 0, "Max reserve out should be > 0");

        vm.stopPrank();
    }

    function testSweetSpotCalculation() public {
        vm.startPrank(WETH_WHALE);

        uint256 testVolume = 33333333333333333333; // 33.33 ETH
        uint256 effectiveGasInDollars = 30; // $30 gas cost

        // Test WETH-USDC pair
        (uint256 sweetSpot, address bestDex, address router) =
            streamDaemon.evaluateSweetSpotAndDex(WETH, USDC, testVolume, effectiveGasInDollars);
        assertTrue(bestDex != address(0), "Best DEX should not be zero address");
        assertTrue(sweetSpot >= 4, "Sweet spot should be >= 4");
        assertTrue(sweetSpot <= 500, "Sweet spot should be <= 500");

        // Test WETH-WBTC pair
        (sweetSpot, bestDex, router) =
            streamDaemon.evaluateSweetSpotAndDex(WETH, WBTC, testVolume, effectiveGasInDollars);
        assertTrue(bestDex != address(0), "Best DEX should not be zero address");
        assertTrue(sweetSpot >= 4, "Sweet spot should be >= 4");
        assertTrue(sweetSpot <= 500, "Sweet spot should be <= 500");

        vm.stopPrank();
    }

    function testInvalidTokenPair() public {
        vm.startPrank(WETH_WHALE);

        // Test with invalid token pair (zero address)
        vm.expectRevert("No DEX found for token pair");
        streamDaemon.findHighestReservesForTokenPair(address(0), USDC);

        vm.stopPrank();
    }

    function testCompareUniswapV2V3Reserves() public {
        vm.startPrank(WETH_WHALE);

        // Test WETH-USDC pair
        (uint256 v2ReserveIn, uint256 v2ReserveOut) = uniswapV2Fetcher.getReserves(WETH, USDC);
        (uint256 v3ReserveIn, uint256 v3ReserveOut) = uniswapV3Fetcher.getReserves(WETH, USDC);

        console.log("\n=== Comparing Uniswap V2 vs V3 Reserves for WETH-USDC ===");
        console.log("V2 Reserve In:", v2ReserveIn);
        console.log("V2 Reserve Out:", v2ReserveOut);
        console.log("V3 Reserve In:", v3ReserveIn);
        console.log("V3 Reserve Out:", v3ReserveOut);

        // Both should have non-zero reserves
        assertTrue(v2ReserveIn > 0, "UniswapV2 reserveIn should be > 0");
        assertTrue(v2ReserveOut > 0, "UniswapV2 reserveOut should be > 0");
        assertTrue(v3ReserveIn > 0, "UniswapV3 reserveIn should be > 0");
        assertTrue(v3ReserveOut > 0, "UniswapV3 reserveOut should be > 0");

        // Test WETH-WBTC pair
        (v2ReserveIn, v2ReserveOut) = uniswapV2Fetcher.getReserves(WETH, WBTC);
        (v3ReserveIn, v3ReserveOut) = uniswapV3Fetcher.getReserves(WETH, WBTC);

        console.log("\n=== Comparing Uniswap V2 vs V3 Reserves for WETH-WBTC ===");
        console.log("V2 Reserve In:", v2ReserveIn);
        console.log("V2 Reserve Out:", v2ReserveOut);
        console.log("V3 Reserve In:", v3ReserveIn);
        console.log("V3 Reserve Out:", v3ReserveOut);

        // Both should have non-zero reserves
        assertTrue(v2ReserveIn > 0, "UniswapV2 reserveIn should be > 0");
        assertTrue(v2ReserveOut > 0, "UniswapV2 reserveOut should be > 0");
        assertTrue(v3ReserveIn > 0, "UniswapV3 reserveIn should be > 0");
        assertTrue(v3ReserveOut > 0, "UniswapV3 reserveOut should be > 0");

        vm.stopPrank();
    }

    function run() external {
        // Run all tests
        testUniswapV2Reserves();
        testSushiSwapReserves();
        testUniswapV3Reserves();
        testStreamDaemonHighestReserves();
        testSweetSpotCalculation();
        testInvalidTokenPair();
        testCompareUniswapV2V3Reserves();
    }
}
