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

    function placeTrade(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin, /*address owner, */bool isInstasettlable, uint256 botGasAllowance)
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
        IERC20 token = IERC20(tokenIn);
        require(token.transferFrom(msg.sender, address(this), amountIn), "Transfer failed"); // no balances are required since they are tracked in trade struct

        // generate trade
        Utils.Trade memory trade;

        trade.owner = msg.sender; // @audit this will need updating when we have a router
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

        // now, we store the trade in contract storage;
        pairIdTradeIds[pairId].push(lastTradeId);
        trades[lastTradeId] = trade;
        lastTradeId++;

        // now, we execute a single stream;
        // (uint256 realisedAmountIn, uint256 executedAmountOut, uint256 sweetSpot) = _executeStream(tokenIn, tokenOut, amountIn, amountOutMin, address(this));

        // lets rather pass a trade object into the executeStrram function, and we can correct the rebalancing action inside that function in a second
        Utils.Trade memory updatedTrade = _executeStream(trade);

        // note that this transfer should be deterministically sent to the owner of the trade
        if (updatedTrade.lastSweetSpot == 1) {
            // we execute the stream AND transfer assets out
            IERC20(tokenOut).transfer(updatedTrade.owner, updatedTrade.realisedAmountOut);
            // no need to update or even store the trade's metadata. the above logic can be optimised @audit since caching in memory s gonna cost
        }

        // lastly, we update the trade in storage
        trades[lastTradeId - 1] = updatedTrade;
    }



    function cancelTrade(uint256 tradeId)
        public
        returns
        (bool)
    {
        /**
         * should take a tradeId
         * verify the owner of the trade is msg.sender
         * if so, store the trade in memory
         * then delete the trade from storage
         * then transfer out appropriate assets to the trade owner
         */

        // @audit It is essential that this authority may be granted by a bot, therefore meaning if the msg.sender is Core. 
        // @audit Similarly, when the Router is implemented, we mnust forward the msg.sdner in the function call
        Utils.Trade memory trade = trades[tradeId];
        if (trade.owner == msg.sender) {
            // Delete the trade from storage
            delete trades[tradeId];
            // Transfer out the appropriate assets
            IERC20(trade.tokenOut).transfer(msg.sender, trade.realisedAmountOut);
            // and transfer amount remaining
            IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining);
            return true;
        } else {
            return false;
        }
    }

    function executeTrades(address tokenIn, address tokenOut) public {
        /**
         * this should take trades stored in the queue,
         * executing stream volumes 1 by 1 via executeStream(), returning the amount settled
         * and thereafter update the trade's metadata.
         *
         * rightful considerations must be given to:
         * - the number of attempts! TICK
         * - the trade's realised slippage TICK
         * - the trade's realised gas cost TICK
         * - the trade's target amountOut vs realised amountOut
         * - if streamCount = 1 || 2, we execute the stream AND transfer assets out
         * - update the number of attempts
         * - update the latest stream count
         * 
         * 
         * and ultimately, integrate fees...
         */

        bytes32 pairId = keccak256(abi.encode(tokenIn, tokenOut));
        uint256[] memory tradeIds = pairIdTradeIds[pairId];

        for (uint256 i = 0; i < tradeIds.length; i++) {
            Utils.Trade memory trade = trades[tradeIds[i]];

            if (trade.attempts >= 3) {
                // we delete the trade from storage
                delete trades[tradeIds[i]];
                continue;
            } else {
            try this._executeStream(trade) returns (Utils.Trade memory updatedTrade) {
                if (updatedTrade.lastSweetSpot == 1) {
                    IERC20(trade.tokenOut).transfer(updatedTrade.owner, updatedTrade.realisedAmountOut);
                    delete trades[tradeIds[i]];
                } else {
                    trades[tradeIds[i]] = updatedTrade;
                }
            } catch {
                //increment attempts and keep the trade in the queue
                trades[tradeIds[i]].attempts++;
                // Emit FailedTrade(attemptsNumber);
            }
            }  
        }
    }

    function _executeStream(Utils.Trade memory trade)
        public
        returns (Utils.Trade memory updatedTrade)
    {
        initiateGasRecord();

        (uint256 sweetSpot, address bestDex) = streamDaemon.evaluateSweetSpotAndDex(
            trade.tokenIn,
            trade.tokenOut,
            trade.amountIn,
            readTWAPGasCost(10) // no longer need this parameter being passed in @audit
        );
        if (trade.lastSweetSpot == 1) { // ensure we have scaled that sweet spot well @audit
            sweetSpot = 1;
        } else if (sweetSpot <= 1) {
            sweetSpot = 2;
        } else if (sweetSpot > 500) {
            sweetSpot = 500; // this is an arbitrary value once more
        }
        uint256 streamVolume = trade.amountIn / sweetSpot;
        

        if (bestDex == uniswapV2Router) {
            (bool success, bytes memory result) = address(executor).delegatecall(
                abi.encodeWithSelector(
                    Executor.executeUniswapV2Trade.selector,
                    uniswapV2Router,
                    trade.tokenIn,
                    trade.tokenOut,
                    streamVolume,
                    trade.targetAmountOut / sweetSpot,
                    address(this)
                )
            );
            require(success, "UniswapV2 trade failed");
            trade.realisedAmountOut += abi.decode(result, (uint256));
        } else if (bestDex == uniswapV3Router) {
            (bool success, bytes memory result) = address(executor).delegatecall(
                abi.encodeWithSelector(
                    Executor.executeUniswapV3Trade.selector,
                    uniswapV3Router,
                    trade.tokenIn,
                    trade.tokenOut,
                    streamVolume,
                    trade.targetAmountOut / sweetSpot,
                    address(this),
                    3000 // default fee tier
                )
            );
            require(success, "UniswapV3 trade failed");
            trade.realisedAmountOut += abi.decode(result, (uint256));
        } else if (bestDex == balancerVault) {
            // TODO: get poolId from StreamDaemon or registry
            bytes32 poolId = bytes32(0);
            (bool success, bytes memory result) = address(executor).delegatecall(
                abi.encodeWithSelector(
                    Executor.executeBalancerTrade.selector,
                    balancerVault,
                    trade.tokenIn,
                    trade.tokenOut,
                    streamVolume,
                    trade.targetAmountOut / sweetSpot,
                    address(this),
                    poolId
                )
            );
            require(success, "Balancer trade failed");
            trade.realisedAmountOut += abi.decode(result, (uint256));
        } else if (bestDex == sushiswapRouter) {
            (bool success, bytes memory result) = address(executor).delegatecall(
                abi.encodeWithSelector(
                    Executor.executeUniswapV2Trade.selector, // Sushiswap uses the same interface as UniswapV2
                    sushiswapRouter,
                    trade.tokenIn,
                    trade.tokenOut,
                    streamVolume,
                    trade.targetAmountOut / sweetSpot,
                    address(this)
                )
            );
            require(success, "Sushiswap trade failed");
            trade.realisedAmountOut += abi.decode(result, (uint256));
        } else if (bestDex == curvePool) {
            (bool success, bytes memory result) = address(executor).delegatecall(
                abi.encodeWithSelector(
                    Executor.executeCurveTrade.selector,
                    curvePool,
                    trade.tokenIn,
                    trade.tokenOut,
                    streamVolume,
                    trade.targetAmountOut / sweetSpot,
                    address(this)
                )
            );
            require(success, "Curve trade failed");
            trade.realisedAmountOut += abi.decode(result, (uint256));
        }

        uint256 realisedGas = readTWAPGasCost(10); // using an arbitrary delta here
        trade.cumulativeGasEntailed = uint96(realisedGas);
        trade.lastSweetSpot = sweetSpot == 2 ? 1 : sweetSpot; // Store the number of streams as the last sweet spot
        trade.amountRemaining = trade.amountRemaining - streamVolume;
        updatedTrade = trade;

        closeGasRecord();
        return updatedTrade;
    }

    function instasettle(uint256 tradeId) public payable {
        // first we pull the trade from storage into memory
        Utils.Trade memory trade = trades[tradeId];
        // then we check if the trade is instasettlable
        if (trade.isInstasettlable) {
            // then we execute the stream
            require(_settleTrade(trade/**, tradePlacer */), "Trade not settled");
        }
        // Emit Instasettled(tradeId);
    }

    function _settleTrade(Utils.Trade memory trade/**, address instasettler */) internal returns (bool) {
        // we need to ensure the amount of provided tokenIn satisfies the remainingTokenOut from the trade
        // if so, we execute a full trade swap (no streams)
        uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
        // then, we take the bps
        uint256 instasettleBps = trade.instasettleBps;
        uint256 instasettleAmount = trade.amountRemaining - (trade.amountRemaining * instasettleBps) / 10000;
        // if the instasettleAmount is less than the remainingAmountOut, we revert
        require(instasettleAmount >= remainingAmountOut, "Insufficient balance to settle trade");
        // if so, we execute a full trade swap (no streams)
        //first we initialise the interface
        IERC20 tokenOut = IERC20(trade.tokenOut);
        //then, we transfer money from the purchaser to the owner
        (bool statusIn) = tokenOut.transferFrom(msg.sender, trade.owner, instasettleAmount);
        //then, we transfer the remaining amount of tokenIn to the purchaser
        (bool statusOut) = IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining); // @audit we pass msg.sender here for testing without a Router, but we should have auth for Router access set up and the caller's address passed as a parameter from Router on this function call
        return statusIn == statusOut ? true : false;
    }
}
