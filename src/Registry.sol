// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IUniversalDexInterface.sol";
import "./Executor.sol";

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
        // Get DEX type from the fetcher
        IUniversalDexInterface fetcher = IUniversalDexInterface(dex);
        string memory dexType = fetcher.getDexType();
        
        // Get router for this DEX type
        address router = dexRouters[dexType];
        require(router != address(0), "Router not configured");

        // Prepare trade data based on DEX type
        if (_compareStrings(dexType, "UniswapV2")) {
            return _prepareUniswapV2Trade(tokenIn, tokenOut, amount, minOut, recipient, router);
        } else if (_compareStrings(dexType, "UniswapV3")) {
            return _prepareUniswapV3Trade(tokenIn, tokenOut, amount, minOut, recipient, router);
        } else if (_compareStrings(dexType, "Balancer")) {
            return _prepareBalancerTrade(tokenIn, tokenOut, amount, minOut, recipient, router);
        } else if (_compareStrings(dexType, "Curve")) {
            return _prepareCurveTrade(tokenIn, tokenOut, amount, minOut, recipient, router);
        } else if (_compareStrings(dexType, "Sushiswap")) {
            return _prepareSushiswapTrade(tokenIn, tokenOut, amount, minOut, recipient, router);
        }
        
        revert("Unsupported DEX type");
    }

    function _prepareUniswapV2Trade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            router
        );

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
        bytes32 poolId = bytes32(0); // This should be stored/retrieved appropriately
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            poolId,
            router
        );

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
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            router
        );

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
        // Sushiswap uses the same interface as UniswapV2
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            router
        );

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