// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Core.sol";
import "../src/StreamDaemon.sol";
import "../src/Executor.sol";
import "../src/Registry.sol";
import "../src/adapters/UniswapV2Fetcher.sol";
import "../src/adapters/SushiswapFetcher.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SingleDexProtocol is Test {
    // Core protocol contracts
    Core public core;
    StreamDaemon public streamDaemon;
    Executor public executor;
    Registry public registry;

    // DEX addresses on mainnet
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    uint24 constant UNISWAP_V3_FEE = 3000; // 0.3% fee tier
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant CURVE_POOL = 0x4eBdF703948ddCEA3B11f675B4D1Fba9d2414A14; // USDC/USDT pool

    // Common token addresses for testing
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

    // Real whale addresses
    address constant WETH_WHALE = 0x2F0b23f53734252Bda2277357e97e1517d6B042A;
    address constant USDC_WHALE = 0x55FE002aefF02F77364de339a1292923A15844B8;

    // The single DEX fetcher and router to be used
    address public dexFetcher;
    address public dexRouter;

    function setUpSingleDex(address _dexFetcher, address _dexRouter) internal {
        console.log("SingleDexProtocol: Starting setUp for single DEX...");
        console.log("SingleDexProtocol: Fetcher address:", _dexFetcher);
        console.log("SingleDexProtocol: Router address:", _dexRouter);
        
        dexFetcher = _dexFetcher;
        dexRouter = _dexRouter;

        address[] memory dexs = new address[](1);
        dexs[0] = dexFetcher;

        address[] memory routers = new address[](1);
        routers[0] = dexRouter;

        console.log("SingleDexProtocol: Deploying StreamDaemon...");
        streamDaemon = new StreamDaemon(dexs, routers);
        console.log("SingleDexProtocol: StreamDaemon deployed at", address(streamDaemon));

        console.log("SingleDexProtocol: Deploying Executor...");
        executor = new Executor();
        console.log("SingleDexProtocol: Executor deployed at", address(executor));

        console.log("SingleDexProtocol: Deploying Registry...");
        registry = new Registry();
        console.log("SingleDexProtocol: Registry deployed at", address(registry));

        // Configure registry with appropriate router
        string memory dexType;
        console.log("SingleDexProtocol: Determining DEX type for router", dexRouter);
        if (dexRouter == UNISWAP_V2_ROUTER) {
            dexType = "UniswapV2";
            console.log("SingleDexProtocol: Identified as UniswapV2");
        } else if (dexRouter == SUSHISWAP_ROUTER) {
            dexType = "Sushiswap";
            console.log("SingleDexProtocol: Identified as Sushiswap");
        } else if (dexRouter == UNISWAP_V3_ROUTER) {
            dexType = "UniswapV3";
            console.log("SingleDexProtocol: Identified as UniswapV3");
        } else if (dexRouter == BALANCER_VAULT) {
            dexType = "Balancer";
            console.log("SingleDexProtocol: Identified as Balancer");
        } else if (dexRouter == CURVE_POOL) {
            dexType = "Curve";
            console.log("SingleDexProtocol: Identified as Curve");
        } else {
            console.log("SingleDexProtocol: ERROR - Unsupported DEX router", dexRouter);
            revert("Unsupported DEX router");
        }
        console.log("SingleDexProtocol: Setting router in Registry for type", dexType);
        registry.setRouter(dexType, dexRouter);

        console.log("SingleDexProtocol: Deploying Core...");
        core = new Core(
            address(streamDaemon),
            address(executor),
            address(registry)
        );

        vm.startPrank(WETH_WHALE);
        IERC20(WETH).transfer(address(this), 100 * 1e18); // 100 WETH
        vm.stopPrank();

        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(address(this), 200_000 * 1e6); // 200,000 USDC
        vm.stopPrank();

        IERC20(WETH).approve(address(core), type(uint256).max);
        IERC20(USDC).approve(address(core), type(uint256).max);
    }

    function getTokenDecimals(address token) public view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    function formatTokenAmount(address token, uint256 amount) public view returns (uint256) {
        return amount * (10 ** getTokenDecimals(token));
    }

    function getTokenBalance(address token, address account) public view returns (uint256) {
        return IERC20(token).balanceOf(account);
    }

    function approveToken(address token, address spender, uint256 amount) public {
        IERC20(token).approve(spender, amount);
    }
} 