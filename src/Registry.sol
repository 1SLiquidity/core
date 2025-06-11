// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IUniversalDexInterface.sol";
import "./Executor.sol";
import "forge-std/console.sol";

/**
 * @title Registry
 * @notice Registry for preparing DEX-specific trade data
 */
contract Registry is IRegistry, Ownable {
    // Immutable DEX-specific parameters
    uint24 public constant UNISWAP_V3_FEE = 3000; // 0.3%
    uint160 public constant SQRT_PRICE_LIMIT_X96 = 0;
    
    // DEX type to router mapping
    mapping(string => address) public dexRouters;
    
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set router address for a DEX type
     * @param dexType The DEX type (e.g. "UniswapV2")
     * @param router The router address
     */
    function setRouter(string calldata dexType, address router) external onlyOwner {
        require(router != address(0), "Invalid router address");
        console.log("Registry: Setting router for DEX type", dexType);
        console.log("Registry: Router address", router);
        dexRouters[dexType] = router;
    }

    /**
     * @notice Prepares trade data based on the DEX type
     */
    function prepareTradeData(
        address dex,
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient
    ) external view override returns (TradeData memory) {
        console.log("Registry: Preparing trade data for DEX at", dex);
        console.log("Registry: Input parameters:");
        console.log("  - Token in:", tokenIn);
        console.log("  - Token out:", tokenOut);
        console.log("  - Amount:", amount);
        console.log("  - Min out:", minOut);
        console.log("  - Recipient:", recipient);
        
        // Get DEX type from the fetcher
        IUniversalDexInterface fetcher = IUniversalDexInterface(dex);
        string memory dexType = fetcher.getDexType();
        console.log("Registry: Fetcher returned DEX type", dexType);
        
        // Get router for this DEX type
        address router = dexRouters[dexType];
        console.log("Registry: Found router for DEX type", router);
        require(router != address(0), "Router not configured");

        // Prepare trade data based on DEX type
        TradeData memory tradeData;
        console.log("Registry: Preparing trade data for DEX type:", dexType);

        if (_compareStrings(dexType, "UniswapV2")) {
            tradeData = _prepareUniswapV2Trade(tokenIn, tokenOut, amount, minOut, recipient, router);
            console.log("Registry: Prepared UniswapV2 trade data");
        } else if (_compareStrings(dexType, "UniswapV3")) {
            tradeData = _prepareUniswapV3Trade(tokenIn, tokenOut, amount, minOut, recipient, router);
            console.log("Registry: Prepared UniswapV3 trade data");
        } else if (_compareStrings(dexType, "Balancer")) {
            tradeData = _prepareBalancerTrade(tokenIn, tokenOut, amount, minOut, recipient, router);
            console.log("Registry: Prepared Balancer trade data");
        } else if (_compareStrings(dexType, "Curve")) {
            tradeData = _prepareCurveTrade(tokenIn, tokenOut, amount, minOut, recipient, router);
            console.log("Registry: Prepared Curve trade data");
        } else if (_compareStrings(dexType, "Sushiswap")) {
            tradeData = _prepareSushiswapTrade(tokenIn, tokenOut, amount, minOut, recipient, router);
            console.log("Registry: Prepared Sushiswap trade data");
        } else {
            console.log("Registry: Unsupported DEX type:", dexType);
            revert("Unsupported DEX type");
        }

        console.log("Registry: Trade data prepared successfully");
        console.log("  - Router:", tradeData.router);
        console.log("  - Selector: 0x%x", uint32(tradeData.selector));
        console.log("  - Params length:", tradeData.params.length);
        
        return tradeData;
    }

    function _prepareUniswapV2Trade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {
        console.log("Registry: Preparing UniswapV2 trade data");
        console.log("Registry: Token in:", tokenIn);
        console.log("Registry: Token out:", tokenOut);
        console.log("Registry: Amount:", amount);
        console.log("Registry: Min out:", minOut);
        console.log("Registry: Recipient:", recipient);
        console.log("Registry: Router:", router);

        // Encode all parameters into a single bytes value
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            router
        );
        console.log("Registry: Parameters encoded");

        return TradeData({
            selector: Executor.executeUniswapV2Trade.selector,
            router: router,
            params: params
        });
    }

    function _prepareUniswapV3Trade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {
        console.log("Registry: Preparing UniswapV3 trade data");
        console.log("Registry: Token in:", tokenIn);
        console.log("Registry: Token out:", tokenOut);
        console.log("Registry: Amount:", amount);
        console.log("Registry: Min out:", minOut);
        console.log("Registry: Recipient:", recipient);
        console.log("Registry: Router:", router);

        // Encode all parameters into a single bytes value
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            UNISWAP_V3_FEE,
            SQRT_PRICE_LIMIT_X96,
            router
        );
        console.log("Registry: Parameters encoded");

        return TradeData({
            selector: Executor.executeUniswapV3Trade.selector,
            router: router,
            params: params
        });
    }

    function _prepareBalancerTrade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {
        console.log("Registry: Preparing Balancer trade data");
        console.log("Registry: Token in:", tokenIn);
        console.log("Registry: Token out:", tokenOut);
        console.log("Registry: Amount:", amount);
        console.log("Registry: Min out:", minOut);
        console.log("Registry: Recipient:", recipient);
        console.log("Registry: Router:", router);

        bytes32 poolId = bytes32(0);
        
        // Encode all parameters into a single bytes value
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            poolId,
            router
        );
        console.log("Registry: Parameters encoded");

        return TradeData({
            selector: Executor.executeBalancerTrade.selector,
            router: router,
            params: params
        });
    }

    function _prepareCurveTrade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {
        console.log("Registry: Preparing Curve trade data");
        console.log("Registry: Token in:", tokenIn);
        console.log("Registry: Token out:", tokenOut);
        console.log("Registry: Amount:", amount);
        console.log("Registry: Min out:", minOut);
        console.log("Registry: Recipient:", recipient);
        console.log("Registry: Router:", router);

        // For Curve we need to determine i and j indices
        int128 i = 0;
        int128 j = 1;
        
        // Encode all parameters into a single bytes value
        bytes memory params = abi.encode(
            tokenIn,
            i,
            j,
            amount,
            minOut,
            recipient,
            router
        );
        console.log("Registry: Parameters encoded");

        return TradeData({
            selector: Executor.executeCurveTrade.selector,
            router: router,
            params: params
        });
    }

    function _prepareSushiswapTrade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {
        console.log("Registry: Preparing Sushiswap trade data");
        console.log("Registry: Token in:", tokenIn);
        console.log("Registry: Token out:", tokenOut);
        console.log("Registry: Amount:", amount);
        console.log("Registry: Min out:", minOut);
        console.log("Registry: Recipient:", recipient);
        console.log("Registry: Router:", router);

        // Sushiswap uses the same interface as UniswapV2
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            router
        );
        console.log("Registry: Parameters encoded");

        return TradeData({
            selector: Executor.executeUniswapV2Trade.selector,
            router: router,
            params: params
        });
    }

    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
} 