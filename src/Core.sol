// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./StreamDaemon.sol";
import "./Executor.sol";
import "./Utils.sol";

contract Core is Ownable /*, UUPSUpgradeable */ {
    // @audit must be able to recieve and transfer tokens
    StreamDaemon public streamDaemon;
    Executor public executor;

    // dexs
    address public immutable uniswapV2Router;
    address public immutable sushiswapRouter;
    address public immutable uniswapV3Router;
    address public immutable balancerVault;
    address public immutable curvePool;

    // gas / TWAP
    uint256 private startGas;
    uint256 public lastGasUsed;
    uint256 public lastGasPrice;
    uint256 public lastGasCost;
    uint256[] public TWAP_GAS_COST;

    // trades
    uint256 public lastTradeId;
    mapping(bytes32 => uint256[]) public pairIdTradeIds;
    mapping(uint256 => Utils.Trade) public trades;

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

    function initiateGasRecord() public {
        startGas = gasleft();
    }

    function closeGasRecord() public {
        uint256 gasUsed = startGas - gasleft();
        lastGasUsed = gasUsed;
        lastGasPrice = tx.gasprice;
        lastGasCost = gasUsed * tx.gasprice;
        TWAP_GAS_COST.push(lastGasCost);
    }

    function readTWAPGasCost(uint256 delta) public view returns (uint256) {
        if (TWAP_GAS_COST.length < delta) {
            delta = TWAP_GAS_COST.length;
        }
        uint256 totalGasCost = 0;
        for (uint256 i = 0; i < delta; i++) {
            totalGasCost += TWAP_GAS_COST[i];
        }
        return totalGasCost / TWAP_GAS_COST.length;
    }

    function placeTrade(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient)
        public
    {
        /**
         * this should:
         *
         * transfer funds from the sender to this contract
         * generate trade metadata, featuring:
         * botAllocation // formed of approximated gas cost + BPS for trade settlement
         *  - owner 
         *  -tokenIn
         *  -tokenOut
         *  -tradeId
         *  -pairId
         *  -targetAmountOut // amountOut*(1-slippage)
         *  -realisedAmountOut // @audit must be incremented on each stream execution
         *  -cumulativeGasEntailed
         *  -?isInstasettlable
         *  -?slippage
         *  -?botGasAllowance
         *  -attempts
         *
         * ..entering trade metadata into contract storage
         * execute a single stream
         * (taking 0BPS from the realised amountOut as fees)
         * update the balances respectively
         *
         */
    }

    function cancelTrade(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient)
        public
    {
        /**
         * should take a tradeId
         * verify the owner of the trade is msg.sender
         * if so, store the trade in memory
         * then delete the trade from storage
         * then transfer out appropriate assets to the trade owner
         */
    }

    function executeTrade() public {
        /**
         * this should take a trade stored in a queue,
         * execute it via executeStream(), returning the amount settled
         * and thereafter update the trade's metadata.
         *
         * rightful considerations must be given to:
         * - the trade's realised slippage
         * - the trade's realised gas cost
         * - the trade's target amountOut vs realised amountOut
         * - fees
         */
    }

    function executeStream(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient)
        external
        returns (uint256 amountOut)
    {
        initiateGasRecord();
        (uint256 numStreams, address bestDex) = streamDaemon.evaluateSweetSpotAndDex(
            tokenIn,
            tokenOut,
            amountIn,
            readTWAPGasCost(10) // placeholder delta. need optimisation @audit
        );
        uint256 currentAmount = amountIn / numStreams;

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

        closeGasRecord();

        return amountOut;
    }
}
