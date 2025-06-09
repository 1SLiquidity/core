// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/Core.sol";
import "../src/StreamDaemon.sol";
import "../src/Executor.sol";
import "../src/adapters/UniswapV2Fetcher.sol";
import "../src/adapters/UniswapV3Fetcher.sol";
import "../src/adapters/SushiswapFetcher.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Protocol is Test {
    // Core protocol contracts
    Core public core;
    StreamDaemon public streamDaemon;
    Executor public executor;

    // DEX addresses on mainnet
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    uint24 constant UNISWAP_V3_FEE = 3000;

    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;

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

    function setUp() public virtual {
        console.log("Starting setUp...");

        // Deploy fetchers
        console.log("Deploying UniswapV2Fetcher...");
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, UNISWAP_V3_FEE);
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);

        // Create array of fetcher addresses
        address[] memory dexs = new address[](3);
        dexs[0] = address(uniswapV2Fetcher);
        dexs[1] = address(uniswapV3Fetcher); // Using UniswapV2Fetcher for Sushiswap since they're compatible
        dexs[2] = address(sushiswapFetcher); // Using UniswapV2Fetcher for UniswapV3 for now

        address[] memory routers = new address[](3);
        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = UNISWAP_V3_ROUTER;
        routers[2] = SUSHISWAP_ROUTER;

        console.log("Deploying StreamDaemon...");
        // Deploy StreamDaemon with UniswapV2Fetcher as the dexInterface
        streamDaemon = new StreamDaemon(dexs, routers);

        console.log("Deploying Executor...");
        // Deploy Executor
        executor = new Executor();

        console.log("Deploying Core...");
        // Deploy Core with all dependencies
        core = new Core(
            address(streamDaemon), // _streamDaemon
            address(executor), // _executor
            UNISWAP_V2_ROUTER, // _uniswapV2Router
            SUSHISWAP_ROUTER, // _sushiswapRouter
            UNISWAP_V3_ROUTER, // _uniswapV3Router
            BALANCER_VAULT, // _balancerVault
            CURVE_POOL, // _curvePool
            100000
        );

        // Log deployment addresses
        console.log("StreamDaemon deployed at: %s", address(streamDaemon));
        console.log("Executor deployed at: %s", address(executor));
        console.log("Core deployed at: %s", address(core));

        // Fund the test contract with tokens by impersonating different whale addresses
        console.log("Checking whale balances...");
        console.log("WETH Whale balance: %s", getTokenBalance(WETH, WETH_WHALE));
        console.log("USDC Whale balance: %s", getTokenBalance(USDC, USDC_WHALE));

        console.log("Attempting WETH transfer...");
        vm.startPrank(WETH_WHALE);
        try IERC20(WETH).transfer(address(this), formatTokenAmount(WETH, 1)) {
            console.log("WETH transfer successful");
        } catch Error(string memory reason) {
            console.log("WETH transfer failed with reason: %s", reason);
        } catch (bytes memory lowLevelData) {
            console.log("WETH transfer failed with low level error");
            console.log("Error data length: %s", lowLevelData.length);
        }
        vm.stopPrank();

        console.log("Attempting USDC transfer...");
        vm.startPrank(USDC_WHALE);
        try IERC20(USDC).transfer(address(this), formatTokenAmount(USDC, 100)) {
            console.log("USDC transfer successful");
        } catch Error(string memory reason) {
            console.log("USDC transfer failed with reason: %s", reason);
        } catch (bytes memory lowLevelData) {
            console.log("USDC transfer failed with low level error");
            console.log("Error data length: %s", lowLevelData.length);
        }
        vm.stopPrank();

        console.log("Final test contract balances:");
        console.log("Test contract WETH balance: %s", getTokenBalance(WETH, address(this)));
        console.log("Test contract USDC balance: %s", getTokenBalance(USDC, address(this)));

        console.log("setUp completed");
    }

    // Helper function to get token decimals
    function getTokenDecimals(address token) public view returns (uint8) {
        return IERC20Metadata(token).decimals();
    }

    // Helper function to format token amounts
    function formatTokenAmount(address token, uint256 amount) public view returns (uint256) {
        return amount * (10 ** getTokenDecimals(token));
    }

    // Helper function to get token balance
    function getTokenBalance(address token, address account) public view returns (uint256) {
        return IERC20(token).balanceOf(account);
    }

    // Helper function to approve token spending
    function approveToken(address token, address spender, uint256 amount) public {
        IERC20(token).approve(spender, amount);
    }

    // Basic test to verify setup
    function testSetup() public view {
        // Verify contract deployments
        assertTrue(address(core) != address(0), "Core not deployed");
        assertTrue(address(streamDaemon) != address(0), "StreamDaemon not deployed");
        assertTrue(address(executor) != address(0), "Executor not deployed");

        // Verify token balances
        uint256 wethBalance = getTokenBalance(WETH, address(this));
        uint256 usdcBalance = getTokenBalance(USDC, address(this));

        assertTrue(wethBalance > 0, "No WETH balance");
        assertTrue(usdcBalance > 0, "No USDC balance");

        console.log("WETH Balance: %s", wethBalance);
        console.log("USDC Balance: %s", usdcBalance);
    }

    function run() virtual external {
        setUp();
        testSetup();
    }
}
