// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./StreamDaemon.sol";
import "./Executor.sol";

contract Core is Ownable/*, UUPSUpgradeable */ {
    StreamDaemon public immutable streamDaemon;
    Executor public immutable executor;
    
    // DEX router addresses
    address public immutable uniswapV2Router;
    address public immutable sushiswapRouter;
    address public immutable uniswapV3Router;
    address public immutable balancerVault;
    address public immutable curvePool;
    
    constructor(
        address _streamDaemon,
        address _executor,
        address _uniswapV2Router,
        address _sushiswapRouter,
        address _uniswapV3Router,
        address _balancerVault,
        address _curvePool
    ) Ownable(msg.sender) {
        streamDaemon = StreamDaemon(_streamDaemon);
        executor = Executor(_executor);
        uniswapV2Router = _uniswapV2Router;
        uniswapV3Router = _uniswapV3Router;
        balancerVault = _balancerVault;
        curvePool = _curvePool;
        sushiswapRouter = _sushiswapRouter;
    }

    // function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function initiateGasRecord() public {}
    function closeGasRecord() public {}
    
    function executeTrade(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external returns (uint256 amountOut) {
        initiateGasRecord();
        // Get best DEX and number of streams from StreamDaemon
        (uint256 numStreams, address bestDex) = streamDaemon.evaluateSweetSpotAndDex(
            tokenIn,
            tokenOut,
            amountIn,
            1 // TODO: Calculate effective gas
        );
        
        // Calculate amount per stream
        uint256 amountPerStream = amountIn / numStreams;
        
        // Execute trades across streams
        for (uint256 i = 0; i < numStreams; i++) {
            uint256 currentAmount = i == numStreams - 1 ? amountIn - (amountPerStream * i) : amountPerStream;
            
            // Execute trade on best DEX
            if (bestDex == uniswapV2Router) {
                (bool success, bytes memory result) = address(executor).delegatecall(
                    abi.encodeWithSelector(
                        Executor.executeUniswapV2Trade.selector,
                        uniswapV2Router,
                        tokenIn,
                        tokenOut,
                        currentAmount,
                        amountOutMin * currentAmount / amountIn,
                        recipient
                    )
                );
                require(success, "UniswapV2 trade failed");
                amountOut += abi.decode(result, (uint256));
            } else if (bestDex == uniswapV3Router) {
                (bool success, bytes memory result) = address(executor).delegatecall(
                    abi.encodeWithSelector(
                        Executor.executeUniswapV3Trade.selector,
                        uniswapV3Router,
                        tokenIn,
                        tokenOut,
                        currentAmount,
                        amountOutMin * currentAmount / amountIn,
                        recipient,
                        3000 // default fee tier
                    )
                );
                require(success, "UniswapV3 trade failed");
                amountOut += abi.decode(result, (uint256));
            } else if (bestDex == balancerVault) {
                // TODO: get poolId from StreamDaemon or registry
                bytes32 poolId = bytes32(0);
                (bool success, bytes memory result) = address(executor).delegatecall(
                    abi.encodeWithSelector(
                        Executor.executeBalancerTrade.selector,
                        balancerVault,
                        tokenIn,
                        tokenOut,
                        currentAmount,
                        amountOutMin * currentAmount / amountIn,
                        recipient,
                        poolId
                    )
                );
                require(success, "Balancer trade failed");
                amountOut += abi.decode(result, (uint256));
            }
        }
        closeGasRecord();

        return amountOut;
    }
}