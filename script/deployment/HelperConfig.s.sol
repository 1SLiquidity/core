// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import { Script, console } from "forge-std/Script.sol";
import { UniswapV2Fetcher } from "src/adapters/UniswapV2Fetcher.sol";
import { UniswapV3Fetcher } from "src/adapters/UniswapV3Fetcher.sol";
import { SushiswapFetcher } from "src/adapters/SushiswapFetcher.sol";

import { MockFetcher1, MockFetcher2 } from "test/mock/MockFetcher.sol";

contract HelperConfig is Script {
    struct DexTypeRouter {
        string dexType;
        address router;
    }

    DexTypeRouter[] public activeDexTypesRouters;
    address[] public activeDexes;
    address[] public activeRouters;
    uint256 public activeLastGasUsed;

    constructor() {
        if (block.chainid == 1) {
            console.log("Deploying on Mainnet");
            //Registry.sol
            address UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
            address UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
            address SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
            address BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
            address CURVE_POOL = 0x4eBdF703948ddCEA3B11f675B4D1Fba9d2414A14;

            activeDexTypesRouters.push(DexTypeRouter({ dexType: "UniswapV2", router: UNISWAP_V2_ROUTER }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "UniswapV3", router: UNISWAP_V3_ROUTER }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Sushiswap", router: SUSHISWAP_ROUTER }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Balancer", router: BALANCER_VAULT }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Curve", router: CURVE_POOL }));

            UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // UniswapV2
            UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(0x1F98431c8aD98523631AE4a59f267346ea31F984, 3000); // UniswapV3
            SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac); // Sushiswap

            // StreamDaemon.sol
            activeDexes.push(address(uniswapV2Fetcher));
            activeDexes.push(address(uniswapV3Fetcher));
            activeDexes.push(address(sushiswapFetcher));

            activeRouters.push(UNISWAP_V2_ROUTER);
            activeRouters.push(UNISWAP_V3_ROUTER);
            activeRouters.push(SUSHISWAP_ROUTER);

            activeLastGasUsed = 100_000;
        } else if (block.chainid == 31_337) {
            console.log("Deploying on anvil");
            address router1 = address(0x0000000000000000000000000000000000000001);
            address router2 = address(0x0000000000000000000000000000000000000002);

            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Mock1", router: router1 }));
            activeDexTypesRouters.push(DexTypeRouter({ dexType: "Mock2", router: router2 }));

            MockFetcher1 mockFetcher1 = new MockFetcher1();
            MockFetcher2 mockFetcher2 = new MockFetcher2();

            // StreamDaemon.sol
            activeDexes.push(address(mockFetcher1));
            activeDexes.push(address(mockFetcher2));

            activeRouters.push(router1);
            activeRouters.push(router2);

            activeLastGasUsed = 100_000;
        } else {
            revert("Unsupported network");
        }
    }

    function getActiveDexTypesRouters() public view returns (DexTypeRouter[] memory) {
        return activeDexTypesRouters;
    }

    function getActiveDexes() public view returns (address[] memory) {
        return activeDexes;
    }

    function getActiveRouters() public view returns (address[] memory) {
        return activeRouters;
    }
}
