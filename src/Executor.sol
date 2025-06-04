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
import "forge-std/console.sol";

contract Executor {

    using SafeERC20 for IERC20;

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
        address core,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        address router
    ) external returns (uint256) {
        console.log("Executing UniswapV2 trade");
        IERC20(tokenIn).approve(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router(router).swapExactTokensForTokens(
            amountIn, amountOutMin, path, address(this), block.timestamp + 300
        );

        // No need to transfer tokens since we're using delegatecall
        // The tokens will already be in Core's context
        return IERC20(tokenOut).balanceOf(address(this));
    }

    function executeUniswapV3Trade(
        address dex,
        bytes memory params
    ) external returns (uint256) {
        // Decode parameters
        (address tokenIn, address tokenOut, uint256 amountIn,,,,, address router) = abi.decode(
            params,
            (address, address, uint256, uint256, address, uint24, uint160, address)
        );

        // Execute the trade
        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 3000, // Default to 0.3%
            recipient: address(this), // Send to Core (since we're in Core's context via delegatecall)
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0, // No slippage check in test
            sqrtPriceLimitX96: 0
        });

        // Execute swap and return output amount
        IUniswapV3Router(router).exactInputSingle(swapParams);
        
        // No need to transfer tokens since we're using delegatecall
        // The tokens will already be in Core's context
        return IERC20(tokenOut).balanceOf(address(this));
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
        console.log("Executing Balancer trade");
        IERC20(tokenIn).approve(router, amountIn);

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
            recipient: address(this),
            toInternalBalance: false
        });
        
        IBalancerVault(router).swap(singleSwap, funds, amountOutMin, block.timestamp + 300);
        
        // No need to transfer tokens since we're using delegatecall
        // The tokens will already be in Core's context
        return IERC20(tokenOut).balanceOf(address(this));
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
        console.log("Executing Curve trade");
        IERC20(pool).approve(router, amountIn);
        ICurvePool(router).exchange(i, j, amountIn, amountOutMin);
        
        // No need to transfer tokens since we're using delegatecall
        // The tokens will already be in Core's context
        return IERC20(pool).balanceOf(address(this));
    }
}
