// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./StreamDaemon.sol";
import "./Executor.sol";
import "./Utils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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

    // balances
    mapping(address => mapping(address => uint256)) public eoaTokenBalance;
    mapping(address => uint256) public modulusResiduals;

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
        // @audit initialise TWAP_GAS_COST here
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

    function returnDollarValueOfEth() public returns (uint256) {
        /**
         * @audit need to implement this: utilise our UniversalDEXInterface to read eth price from any one of our DEX's
         * // question would we, in fact, rather take na average of eth vakue accross the DEX's? probably not, since we need to 
         * range the value f effective gas between 0.1 - 1 due to sweetSpotAlgo requirements 
         * (streamCount become insane at low gas costs,@audit how do we balance this with user defined inpout for slippage)
         */
    }

    function placeTrade(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address owner, bool isInstasettlable, uint256 botGasAllowance)
        public
        payable
    {

        /**
         * this should:
         *
         * transfer funds from the sender to this contract
         * generate trade metadata, featuring:
         * 
        address owner;
        uint256 tradeId;
        uint256 botAllocation;
        address tokenIn;
        address tokenOut;
        uint256 amount;
        bytes32 pairId;
        uint256 targetAmountOut;
        uint256 realisedAmountOut;
        uint96 cumulativeGasEntailed;
        bool isInstasettlable;
        uint64 slippage; // set to 0 if no custom slippage
        uint64 botGasAllowance;
        uint8 attempts;

         *
         * ..entering trade metadata into contract storage
         * execute a single stream
         * (taking 0BPS from the realised amountOut as fees)
         * update the balances respectively
         *
         */

        // letstransfer funds 
        IERC20(tokenIn).transferFrom(msg.sender, address(this), msg.value);

        // generate trade
        Utils.Trade memory trade;

        trade.owner = owner;
        trade.tradeId = lastTradeId;
        trade.tokenIn = tokenIn;
        trade.tokenOut = tokenOut;
        trade.amountIn = msg.value;
        trade.amountRemaining = msg.value;
        trade.targetAmountOut = amountOutMin;
        trade.isInstasettlable = isInstasettlable;
        trade.botGasAllowance = botGasAllowance;
        trade.attempts = 1; // yes, we initialise to 1 as we are going to execute a stream here
        bytes32 pairId = keccak256(abi.encode(tokenIn, tokenOut));
        trade.pairId = pairId;
        trade.slippage = 0; // not entirely sure on the necessity of this here, as its derivable from amountIn vs targetOut, and is predetermined: all trades experience 1% slippage

        // now, we store the trade in contract storage;
        pairIdTradeIds[pairId].push(lastTradeId);
        trades[lastTradeId] = trade;
        lastTradeId++;

        // now, we execute a single stream;
        (uint256 realisedAmountIn, uint256 executedAmountOut, uint256 sweetSpot) = _executeStream(tokenIn, tokenOut, amountIn, amountOutMin, address(this));

        if (sweetSpot == 1 || sweetSpot == 2) {
            // we execute the stream AND transfer assets out
            IERC20(tokenOut).transfer(msg.sender, executedAmountOut);
            // no need to update or even store the trade's metadata. the above logic can be optimised @audit since caching in memory s gonna cost
        }

        // otherwise we can update the trade's metadata
        uint256 realisedGas = readTWAPGasCost(10); // using an arbitrary delta here
        trade.cumulativeGasEntailed = uint96(realisedGas);
        trade.realisedAmountOut = executedAmountOut;
        trade.lastSweetSpot = sweetSpot; // Store the number of streams as the last sweet spot
        trade.amountRemaining = trade.amountRemaining - realisedAmountIn;

        // Update the trade in storage
        trades[lastTradeId - 1] = trade;
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

    function executeTrades() public {
        /**
         * this should take trades stored in the queue,
         * executing stream volumes 1 by 1 via executeStream(), returning the amount settled
         * and thereafter update the trade's metadata.
         *
         * rightful considerations must be given to:
         * - the number of attempts!
         * - the trade's realised slippage
         * - the trade's realised gas cost
         * - the trade's target amountOut vs realised amountOut
         * - fees
         * - if streamCount = 1 || 2, we execute the stream AND transfer assets out
         * - update the number of attempts
         */
    }

    function _executeStream(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, address recipient)
        internal
        returns (uint256 streamVolume, uint256 amountOut, uint256 lastSweetSpot)
    {
        initiateGasRecord();
        (uint256 sweetSpot, address bestDex) = streamDaemon.evaluateSweetSpotAndDex(
            tokenIn,
            tokenOut,
            amountIn,
            readTWAPGasCost(10) // placeholder delta. need optimisation @audit
        );
        if (sweetSpot < 1e18) { //ensure we have scaled that sweet spot well @audit
            sweetSpot = 1;
        } else if (sweetSpot > 1000e18) {
            sweetSpot = 1000; // this is an arbitrary value once more
        }
        streamVolume = amountIn / sweetSpot;

        if (bestDex == uniswapV2Router) {
            (bool success, bytes memory result) = address(executor).delegatecall(
                abi.encodeWithSelector(
                    Executor.executeUniswapV2Trade.selector,
                    uniswapV2Router,
                    tokenIn,
                    tokenOut,
                    streamVolume,
                    amountOutMin / sweetSpot,
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
                    streamVolume,
                    amountOutMin / sweetSpot,
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
                    streamVolume,
                    amountOutMin / sweetSpot,
                    recipient,
                    poolId
                )
            );
            require(success, "Balancer trade failed");
            amountOut += abi.decode(result, (uint256));
        }

        closeGasRecord();

        return (streamVolume, amountOut, sweetSpot);
    }
}
