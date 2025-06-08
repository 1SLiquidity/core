// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// import {StreamDaemon} from "./StreamDaemon.sol";
// let's rather use safeApprove from openzeppelin
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/dex/IUniswapV2Router.sol";
import "./interfaces/dex/IUniswapV3Router.sol";
import "./interfaces/dex/IBalancerVault.sol";
import "./interfaces/dex/ICurvePool.sol";

contract Executor {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error SwapFailed();

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    function executeUniswapV2Trade(
        address core,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        address router
    ) external returns (uint256) {
        core;
        recipient; // @audit check reason for passing these parameters
        if (amountIn == 0) revert ZeroAmount();
        
        IERC20(tokenIn).approve(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 300
        );

        amounts; // @audit check reason for passing this parameter

        uint256 amountOut = IERC20(tokenOut).balanceOf(address(this));
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    function executeUniswapV3Trade(
        address dex,
        bytes memory params
    ) external returns (uint256) {
        dex; // @audit check reason for passing this param - canwe not derive it from the router here?
        (address tokenIn, address tokenOut, uint256 amountIn,,,,, address router) = abi.decode(
            params,
            (address, address, uint256, uint256, address, uint24, uint160, address)
        );

        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).approve(router, amountIn);

        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 3000, // @audit for now defaults to 0.3% but needs user input on production
            recipient: address(this), // (we're in Core's context via delegatecall so sends to Core)
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: 0, // @audit no slippage check in test. we should aim for 0.1% max slippage
            sqrtPriceLimitX96: 0
        });

        uint256 amountOut = IUniswapV3Router(router).exactInputSingle(swapParams);
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    function executeBalancerTrade(
        address vault,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        bytes32 poolId,
        address router
    ) external returns (uint256) {
        vault;
        recipient; // @audit check reason for passing these parameters
        if (amountIn == 0) revert ZeroAmount();

        IERC20(tokenIn).approve(router, amountIn);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: 0, // GIVEN_IN @audit check param
            assetIn: tokenIn,
            assetOut: tokenOut,
            amount: amountIn,
            userData: ""
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: msg.sender,
            fromInternalBalance: false,
            recipient: address(this),
            toInternalBalance: false
        });

        IBalancerVault(router).swap(singleSwap, funds, amountOutMin, block.timestamp + 300);
        
        uint256 amountOut = IERC20(tokenOut).balanceOf(address(this));
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    function executeCurveTrade(
        address pool,
        int128 i,
        int128 j,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        address router
    ) external returns (uint256) {
        recipient; // @audit check reason for passing these parameters
        if (amountIn == 0) revert ZeroAmount();

        IERC20(pool).approve(router, amountIn);
        ICurvePool(router).exchange(i, j, amountIn, amountOutMin);
        
        uint256 amountOut = IERC20(pool).balanceOf(address(this));
        emit TradeExecuted(pool, pool, amountIn, amountOut);
        return amountOut;
    }
}
