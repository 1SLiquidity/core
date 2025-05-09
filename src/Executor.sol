// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

// import {StreamDaemon} from "./StreamDaemon.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/dex/IUniswapV2Router.sol";
import "./interfaces/dex/IUniswapV3Router.sol";
import "./interfaces/dex/IBalancerVault.sol";
import "./interfaces/dex/ICurvePool.sol";

contract Executor {
    // StreamDaemon public streamDaemon;
    // DEX router addresses
    // address public immutable uniswapV2Router;
    // address public immutable uniswapV3Router;
    // address public immutable balancerVault;

    // constructor(
    //     address _uniswapV2Router,
    //     address _uniswapV3Router,
    //     address _balancerVault
    // ) {
    //     uniswapV2Router = _uniswapV2Router;
    //     uniswapV3Router = _uniswapV3Router;
    //     balancerVault = _balancerVault;
    //     // streamDaemon = StreamDaemon(_streamDaemon);
    // }

    function executeUniswapV2Trade(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external returns (uint256 amountOut) {
        // Approve router to spend tokens
        IERC20(tokenIn).approve(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn, amountOutMin, path, recipient, block.timestamp + 300
        );

        return amounts[1];
    }

    function executeUniswapV3Trade(
        address router,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint24 fee
    ) external returns (uint256 amountOut) {
        // Approve router to spend tokens
        IERC20(tokenIn).approve(router, amountIn);

        IUniswapV3Router.ExactInputSingleParams memory params = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            deadline: block.timestamp + 300,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0
        });

        return IUniswapV3Router(router).exactInputSingle(params);
    }

    function executeBalancerTrade(
        address vault,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        bytes32 poolId
    ) external returns (uint256 amountOut) {
        // Approve vault to spend tokens
        IERC20(tokenIn).approve(vault, amountIn);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: 0, // GIVEN_IN
            assetIn: tokenIn,
            assetOut: tokenOut,
            amount: amountIn,
            userData: ""
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: msg.sender,
            fromInternalBalance: false,
            recipient: recipient,
            toInternalBalance: false
        });

        return IBalancerVault(vault).swap(singleSwap, funds, amountOutMin, block.timestamp + 300);
    }

    function executeCurveTrade(
        address pool,
        int128 i,
        int128 j,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external returns (uint256 amountOut) {
        // Approve pool to spend tokens
        IERC20(pool).approve(pool, amountIn);

        amountOut = ICurvePool(pool).exchange(i, j, amountIn, amountOutMin);

        // Transfer tokens to recipient
        IERC20(pool).transfer(recipient, amountOut);

        return amountOut;
    }
}
