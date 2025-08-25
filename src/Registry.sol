// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IRegistry.sol";
import "./interfaces/IUniversalDexInterface.sol";
import "./Executor.sol";
// import "forge-std/console.sol";

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
    
    // DEX type to executor selector mapping
    mapping(string => bytes4) public dexExecutors;
    
    // DEX type to parameter encoding function mapping
    mapping(string => bytes4) public dexParameterEncoders;
    
    constructor() Ownable(msg.sender) {
        // Register existing DEX types with their executors and parameter encoders
        _registerExistingDexTypes();
    }

    /**
     * @notice Register all existing DEX types
     */
    function _registerExistingDexTypes() internal {
        // UniswapV2-style DEXes
        dexExecutors["UniswapV2"] = Executor.executeUniswapV2Trade.selector;
        dexParameterEncoders["UniswapV2"] = _getUniswapV2ParameterEncoder();
        
        dexExecutors["Sushiswap"] = Executor.executeUniswapV2Trade.selector;
        dexParameterEncoders["Sushiswap"] = _getUniswapV2ParameterEncoder();
        
        // UniswapV3
        dexExecutors["UniswapV3"] = Executor.executeUniswapV3Trade.selector;
        dexParameterEncoders["UniswapV3"] = _getUniswapV3ParameterEncoder();
        
        // Balancer
        dexExecutors["Balancer"] = Executor.executeBalancerTrade.selector;
        dexParameterEncoders["Balancer"] = _getBalancerParameterEncoder();
        
        // Curve
        dexExecutors["Curve"] = Executor.executeCurveTrade.selector;
        dexParameterEncoders["Curve"] = _getCurveParameterEncoder();
    }

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
     * @notice Get router address for a DEX type
     * @param dexType The DEX type (e.g. "UniswapV2")
     * @return The router address
     */
    function getRouter(string calldata dexType) external view returns (address) {
        return dexRouters[dexType];
    }

    /**
     * @notice Register a new DEX type with its executor and parameter encoding
     * @param dexType The DEX type identifier
     * @param executorSelector The executor function selector
     * @param parameterEncoder The parameter encoding function selector
     */
    function registerDexType(
        string calldata dexType,
        bytes4 executorSelector,
        bytes4 parameterEncoder
    ) external onlyOwner {
        require(executorSelector != bytes4(0), "Invalid executor selector");
        require(parameterEncoder != bytes4(0), "Invalid parameter encoder");
        
        dexExecutors[dexType] = executorSelector;
        dexParameterEncoders[dexType] = parameterEncoder;
        
    }

    /**
     * @notice Check if a DEX type is supported
     * @param dexType The DEX type to check
     * @return True if supported
     */
    function isDexTypeSupported(string memory dexType) public view returns (bool) {
        return dexExecutors[dexType] != bytes4(0);
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
        TradeData memory tradeData;

        // Check if DEX type is supported
        require(isDexTypeSupported(dexType), "Unsupported DEX type");
        
        // Get executor and parameter encoder for this DEX type
        bytes4 executorSelector = dexExecutors[dexType];
        bytes4 parameterEncoder = dexParameterEncoders[dexType];
        
        // Prepare trade data dynamically
        tradeData = _prepareTradeData(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            router,
            executorSelector,
            parameterEncoder
        );
        
        
        return tradeData;
    }

    /**
     * @notice Prepare trade data dynamically based on DEX type
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amount Amount to trade
     * @param minOut Minimum output amount
     * @param recipient Recipient address
     * @param router Router address
     * @param executorSelector Executor function selector
     * @param parameterEncoder Parameter encoding function selector
     * @return TradeData struct
     */
    function _prepareTradeData(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router,
        bytes4 executorSelector,
        bytes4 parameterEncoder
    ) internal pure returns (TradeData memory) {
        
        bytes memory params;
        
        // Handle different parameter encoding patterns
        if (parameterEncoder == _getUniswapV2ParameterEncoder()) {
            // UniswapV2-style DEXes (PancakeSwap, SushiSwap, etc.)
            params = abi.encode(tokenIn, tokenOut, amount, minOut, recipient, router);
        } else if (parameterEncoder == _getUniswapV3ParameterEncoder()) {
            // UniswapV3-style DEXes
            params = abi.encode(tokenIn, tokenOut, amount, minOut, recipient, UNISWAP_V3_FEE, SQRT_PRICE_LIMIT_X96, router);
        } else if (parameterEncoder == _getBalancerParameterEncoder()) {
            // Balancer-style DEXes
            // BAL/WETH pool on Balancer
            bytes32 poolId = 0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014;
            params = abi.encode(tokenIn, tokenOut, amount, minOut, recipient, poolId, router);
        } else if (parameterEncoder == _getCurveParameterEncoder()) {
            // Curve-style DEXes
            params = _prepareCurveTrade(tokenIn, tokenOut, amount, minOut, recipient, router).params;
        } else {
            // Default to UniswapV2-style encoding
            params = abi.encode(tokenIn, tokenOut, amount, minOut, recipient, router);
        }
        
        return TradeData({
            selector: executorSelector,
            router: router,
            params: params
        });
    }

    // Parameter encoder selectors for different DEX types
    function _getUniswapV2ParameterEncoder() internal pure returns (bytes4) {
        return bytes4(keccak256("UniswapV2Style"));
    }
    
    function _getUniswapV3ParameterEncoder() internal pure returns (bytes4) {
        return bytes4(keccak256("UniswapV3Style"));
    }
    
    function _getBalancerParameterEncoder() internal pure returns (bytes4) {
        return bytes4(keccak256("BalancerStyle"));
    }
    
    function _getCurveParameterEncoder() internal pure returns (bytes4) {
        return bytes4(keccak256("CurveStyle"));
    }

    function _prepareUniswapV2Trade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {

        // Encode all parameters into a single bytes value
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount, 
            minOut,
            recipient,
            router
        );

        return TradeData({ selector: Executor.executeUniswapV2Trade.selector, router: router, params: params });
    }

    function _prepareUniswapV3Trade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {

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

        return TradeData({ selector: Executor.executeUniswapV3Trade.selector, router: router, params: params });
    }

    function _prepareBalancerTrade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal view returns (TradeData memory) {

        // BAL/WETH pool on Balancer
        bytes32 poolId = 0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014;
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

        return TradeData({ selector: Executor.executeBalancerTrade.selector, router: router, params: params });
    }

    function _prepareCurveTrade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {

        // For Curve we need to determine i and j indices based on actual token positions
        // For Curve 3Pool: index 0 = DAI, index 1 = USDC, index 2 = USDT
        int128 i = _getCurveTokenIndex(tokenIn);
        int128 j = _getCurveTokenIndex(tokenOut);
        // Encode all parameters into a single bytes value
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            i,
            j,
            amount,
            minOut,
            recipient,
            router
        );

        return TradeData({ selector: Executor.executeCurveTrade.selector, router: router, params: params });
    }
    
    function _getCurveTokenIndex(address token) internal pure returns (int128) {
        // For Curve 3Pool: index 0 = DAI, index 1 = USDC, index 2 = USDT
        if (token == 0x6B175474E89094C44Da98b954EedeAC495271d0F) return 0; // DAI
        if (token == 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) return 1; // USDC
        if (token == 0xdAC17F958D2ee523a2206206994597C13D831ec7) return 2; // USDT
        return 0; // Default to DAI index
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

    function _preparePancakeSwapTrade(
        address tokenIn,
        address tokenOut,
        uint256 amount,
        uint256 minOut,
        address recipient,
        address router
    ) internal pure returns (TradeData memory) {

        // PancakeSwap uses the same interface as UniswapV2
        bytes memory params = abi.encode(
            tokenIn,
            tokenOut,
            amount,
            minOut,
            recipient,
            router
        );

        return TradeData({ selector: Executor.executeUniswapV2Trade.selector, router: router, params: params });
    }

    function _compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
