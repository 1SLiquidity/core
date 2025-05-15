// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";
import {Executor} from "../src/Executor.sol";
import {IUniversalDexInterface} from "../src/interfaces/IUniversalDexInterface.sol";
import {UniswapV2Fetcher} from "../src/adapters/UniswapV2Fetcher.sol";
import {SushiswapFetcher} from "../src/adapters/SushiswapFetcher.sol";
import {UniswapV3Fetcher} from "../src/adapters/UniswapV3Fetcher.sol";
// import {CurveFetcher} from "../src/adapters/CurveFetcher.sol";
// import {BalancerFetcher} from "../src/adapters/BalancerFetcher.sol";

contract TestReservesScript is Script {
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant CURVE_REGISTRY = 0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5;
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;

    function run() external {
        // running in fork mode
        vm.startBroadcast();

        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);

        uint24[] memory feeTiers = new uint24[](3);
        feeTiers[0] = 500; // 0.05%
        feeTiers[1] = 3000; // 0.3%
        feeTiers[2] = 10000; // 1%
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, feeTiers[1]);
        // CurveFetcher curveFetcher = new CurveFetcher(CURVE_REGISTRY);
        // BalancerFetcher balancerFetcher = new BalancerFetcher(address(0), BALANCER_VAULT); // Placeholder for pool
        address[][] memory tokenPairs = new address[][](4);

        // WETH-USDC
        tokenPairs[0] = new address[](2);
        tokenPairs[0][0] = WETH;
        tokenPairs[0][1] = USDC;

        // WETH-WBTC
        tokenPairs[1] = new address[](2);
        tokenPairs[1][0] = WETH;
        tokenPairs[1][1] = WBTC;

        // WETH-DAI
        tokenPairs[2] = new address[](2);
        tokenPairs[2][0] = WETH;
        tokenPairs[2][1] = DAI;

        // USDC-USDT
        // tokenPairs[3] = new address[](2);
        // tokenPairs[3][0] = USDC;
        // tokenPairs[3][1] = USDT;

        // WETH-UNI
        tokenPairs[3] = new address[](2);
        tokenPairs[3][0] = WETH;
        tokenPairs[3][1] = UNI;

        console.log("\n=== Testing Uniswap V2 Reserves ===");
        testReservesForAllPairs(uniswapV2Fetcher, tokenPairs);

        console.log("\n=== Testing SushiSwap Reserves ===");
        testReservesForAllPairs(sushiswapFetcher, tokenPairs);

        console.log("\n=== Testing Uniswap V3 Reserves ===");
        testReservesForAllPairs(uniswapV3Fetcher, tokenPairs);

        // console.log("\n=== Testing Curve Reserves ===");
        // testReservesForAllPairs(curveFetcher, tokenPairs);

        // console.log("\n=== Testing Balancer Reserves ===");
        // testReservesForAllPairs(balancerFetcher, tokenPairs);

        address[] memory dexAddresses = new address[](3);
        dexAddresses[0] = address(uniswapV2Fetcher);
        dexAddresses[1] = address(sushiswapFetcher);
        dexAddresses[2] = address(uniswapV3Fetcher);
        // dexAddresses[3] = address(curveFetcher);
        // dexAddresses[4] = address(balancerFetcher);

        StreamDaemon streamDaemon = new StreamDaemon(address(uniswapV2Fetcher), dexAddresses);
        console.log("\n=== Testing StreamDaemon's findHighestReservesForTokenPair ===");
        for (uint256 i = 0; i < tokenPairs.length; i++) {
            address token0 = tokenPairs[i][0];
            address token1 = tokenPairs[i][1];

            (address bestDex, uint256 maxReserveIn, uint256 maxReserveOut) = streamDaemon.findHighestReservesForTokenPair(token0, token1);

            console.log(
                string(abi.encodePacked("Best DEX for ", getTokenSymbol(token0), "-", getTokenSymbol(token1), ": "))
            );
            console.log(bestDex);
            console.log("Highest reserve:", maxReserveIn);
        }

        // Add test for sweet spot calculation
        console.log("\n=== Testing Sweet Spot Calculation ===");

        // Convert to more reasonable values
        // For a $10M pool, let's test with 1% ($100,000) of the pool
        // Assuming ETH at $3000, that's about 33.33 ETH
        uint256 testVolume = 33333333333333333333; // 33.33 ETH (with 18 decimals)

        // Gas price in dollar terms (approximate)
        // Assuming ETH at $3000 and gas price of 50 gwei
        // 50 gwei * 200000 gas = 0.01 ETH = $30 at current prices
        // We'll use a simplified dollar value directly
        uint256 gasPriceInDollars = 30; // $30 gas cost

        // Ensure minimum of $1 as mentioned (updated from $0.1)
        uint256 effectiveGasInDollars = gasPriceInDollars > 1 ? gasPriceInDollars : 1;

        for (uint256 i = 0; i < tokenPairs.length; i++) {
            address token0 = tokenPairs[i][0];
            address token1 = tokenPairs[i][1];

            // Scale down reserves for sweet spot calculation to get values in 1-100 range
            (uint256 sweetSpot, address bestFetcher) =
                streamDaemon.evaluateSweetSpotAndDex(token0, token1, testVolume, effectiveGasInDollars);

            console.log(string(abi.encodePacked("Token Pair: ", getTokenSymbol(token0), "-", getTokenSymbol(token1))));
            console.log("Best DEX:", bestFetcher);
            console.log("Sweet Spot:", sweetSpot);
        }

        vm.stopBroadcast();
    }

    function testReservesForAllPairs(IUniversalDexInterface fetcher, address[][] memory tokenPairs) internal view {
        for (uint256 i = 0; i < tokenPairs.length; i++) {
            address token0 = tokenPairs[i][0];
            address token1 = tokenPairs[i][1];

            uint256 reservesA;
            uint256 reservesB;
            try fetcher.getReserves(token0, token1) returns (uint256 resA, uint256 resB) {
                reservesA = resA;
                reservesB = resB;
                console.log(
                    string(abi.encodePacked("Reserves for ", getTokenSymbol(token0), "-", getTokenSymbol(token1), ": "))
                );
                console.log(reservesA, reservesB);
            } catch {
                console.log(
                    string(
                        abi.encodePacked(
                            "Failed to get reserves for ", getTokenSymbol(token0), "-", getTokenSymbol(token1)
                        )
                    )
                );
            }
        }
    }

    function getTokenSymbol(address token) internal pure returns (string memory) {
        if (token == WETH) return "WETH";
        if (token == USDC) return "USDC";
        if (token == WBTC) return "WBTC";
        if (token == DAI) return "DAI";
        if (token == USDT) return "USDT";
        if (token == UNI) return "UNI";
        return "UNKNOWN";
    }
}
