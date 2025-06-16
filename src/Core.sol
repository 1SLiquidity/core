// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./StreamDaemon.sol";
import "./Executor.sol";
import "./Utils.sol";
import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "forge-std/console.sol";

contract Core is Ownable /*, UUPSUpgradeable */ {
    // @audit must be able to recieve and transfer tokens
    StreamDaemon public streamDaemon;
    Executor public executor;
    IRegistry public registry;

    error ToxicTrade(uint256 tradeId);

    event TradeCreated(
        uint256 indexed tradeId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountRemaining,
        uint256 minAmountOut,
        uint256 realisedAmountOut,
        bool isInstasettlable,
        uint256 instasettleBps,
        uint256 botGasAllowance,
        uint96 cumulativeGasEntailed,
        uint256 lastSweetSpot
    );

    event TradeStreamExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 realisedAmountOut,
        uint256 cumulativeGasEntailed,
        uint256 lastSweetSpot
    );

    event TradeCancelled(
        uint256 indexed tradeId,
        uint256 amountRemaining,
        uint256 realisedAmountOut
    );

    event TradeSettled(
        uint256 indexed tradeId,
        address indexed settler,
        uint256 totalAmountIn,
        uint256 totalAmountOut,
        uint256 totalFees
    );

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
        address _registry,
        uint256 _lastGasUsed
    ) Ownable(msg.sender) {
        streamDaemon = StreamDaemon(_streamDaemon);
        executor = Executor(_executor);
        registry = IRegistry(_registry);
        TWAP_GAS_COST.push(_lastGasUsed);
        lastGasUsed = _lastGasUsed;
    }

    // function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function initiateGasRecord() public {
        startGas = gasleft();
    }

    function closeGasRecord() public {
        uint256 gasUsed = startGas - gasleft();
        lastGasUsed = gasUsed;
        lastGasPrice = tx.gasprice;
        lastGasCost = lastGasUsed * tx.gasprice;
        TWAP_GAS_COST.push(lastGasCost);
    } 

    function readTWAPGasCost(uint256 delta) public view returns (uint256) {
        console.log("Reading TWAP gas cost");
        console.log("TWAP length: %s", TWAP_GAS_COST.length);
        if (TWAP_GAS_COST.length == 0) {
            delta = 1;
        } else if (TWAP_GAS_COST.length < delta) {
            delta = TWAP_GAS_COST.length;
        }
        uint256 totalGasCost = 0;
        for (uint256 i = 0; i < delta; i++) {
            totalGasCost += TWAP_GAS_COST[i];
        }
        totalGasCost = totalGasCost > 0 ? totalGasCost / delta : lastGasCost;
        return totalGasCost > lastGasUsed ? totalGasCost / TWAP_GAS_COST.length : 100000;
    }

    function placeTrade(bytes calldata tradeData) public payable {
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            bool isInstasettlable,
            uint256 botGasAllowance
        ) = abi.decode(tradeData, (address, address, uint256, uint256, bool, uint256));
        // @audit may be better to abstract sweetSpot algo to here and pass the value along, since small (<0.001% pool depth) trades shouldn't be split at all and would save hefty logic
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 tradeId = lastTradeId++;
        bytes32 pairId = keccak256(abi.encode(tokenIn, tokenOut)); //@audit optimise this

        // @audit needs attention for small trades - these hsouldn't be entered in the orderbook / storage
        trades[tradeId] = Utils.Trade({
            owner: msg.sender,
            cumulativeGasEntailed: 0,
            attempts: 1,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountRemaining: amountIn,
            targetAmountOut: amountOutMin,
            realisedAmountOut: 0,
            tradeId: tradeId,
            botGasAllowance: botGasAllowance,
            instasettleBps: 100,
            lastSweetSpot: 4,
            isInstasettlable: isInstasettlable
        });

        pairIdTradeIds[pairId].push(tradeId);
        console.log("trade created in memory");

        emit TradeCreated(
            tradeId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountIn, // amountRemaining starts as full amountIn
            amountOutMin,
            0, // realisedAmountOut starts at 0
            isInstasettlable,
            100, // instasettleBps default
            botGasAllowance,
            0, // cumulativeGasEntailed starts at 0
            4 // lastSweetSpot default
        );

        Utils.Trade storage trade = trades[tradeId];
        _executeStream(trade);
    }

    function _cancelTrade(uint256 tradeId) public returns (bool) {
        // @audit It is essential that this authority may be granted by a bot, therefore meaning if the msg.sender is Core.
        // @audit Similarly, when the Router is implemented, we mnust forward the msg.sender in the function call / veridy signed message
        Utils.Trade memory trade = trades[tradeId];
        if (trade.owner == address(0)) {
            revert("Trade does not exist");
        }
        if (trade.owner == msg.sender || msg.sender == address(this)) {
            delete trades[tradeId];
            IERC20(trade.tokenOut).transfer(msg.sender, trade.realisedAmountOut);
            IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining);
            
            emit TradeCancelled(
                tradeId,
                trade.amountRemaining,
                trade.realisedAmountOut
            );
            
            return true;
        } else {
            revert("Only trade owner can cancel");
        }
    }

    function executeTrades(bytes32 pairId) public {

        uint256[] storage tradeIds = pairIdTradeIds[pairId];

        for (uint256 i = 0; i < tradeIds.length; i++) {
            initiateGasRecord();
            Utils.Trade storage trade = trades[tradeIds[i]];

            if (trade.attempts >= 3 || trade.botGasAllowance == 0) {
                // we delete the trade from storage
                _cancelTrade(trade.tradeId);
            } else {
                try this._executeStream(trade) returns (Utils.Trade memory updatedTrade) {
                    if (updatedTrade.lastSweetSpot == 0) {
                        IERC20(trade.tokenOut).transfer(trade.owner, trade.realisedAmountOut);
                        delete trades[tradeIds[i]];
                    }
                } catch {
                    trade.attempts++;
                }
            }
            closeGasRecord();
        }
        lastGasPrice = tx.gasprice;
        lastGasCost = lastGasUsed * tx.gasprice;
        TWAP_GAS_COST.push(lastGasCost); //@audit location and function of gas caching needs attention 
    }

    function _executeStream(Utils.Trade memory trade) public returns (Utils.Trade memory updatedTrade) {
        console.log("Executing stream for trade %s", trade.tradeId);
        uint256 latestGasAverage = readTWAPGasCost(10); // converting this after to uint96 @audit check consistency
        console.log("Latest gas average: %s", latestGasAverage);
        
        Utils.Trade storage storageTrade = trades[trade.tradeId];
        
        uint256 gasCostInWei = latestGasAverage * 0.1 gwei;
        
        if (trade.cumulativeGasEntailed + gasCostInWei > trade.botGasAllowance) {
            _cancelTrade(trade.tradeId);
        }
        // security measure @audit may need review
        if (trade.realisedAmountOut > trade.targetAmountOut) {
            revert ToxicTrade(trade.tradeId);
        }

        (uint256 sweetSpot, address bestDex, address router) = 
            streamDaemon.evaluateSweetSpotAndDex(trade.tokenIn, trade.tokenOut, trade.amountRemaining, latestGasAverage);

        if (trade.lastSweetSpot == 1 || trade.lastSweetSpot == 2 || trade.lastSweetSpot == 3) {
            sweetSpot = trade.lastSweetSpot;
        }
        if (sweetSpot > 500) {
            sweetSpot = 500; // this is an arbitrary value @audit needs revision
        }
        require(sweetSpot > 0, "Invalid sweet spot");

        uint256 streamVolume = trade.amountIn / sweetSpot;
        uint256 targetAmountOut = trade.targetAmountOut / sweetSpot;

        IRegistry.TradeData memory tradeData = registry.prepareTradeData(
            bestDex, 
            trade.tokenIn,
            trade.tokenOut,
            streamVolume,
            targetAmountOut,
            address(this)
        );
        console.log("Core: Trade data prepared");

        IERC20(trade.tokenIn).approve(tradeData.router, streamVolume);
        console.log("Core: Router approved");

        (bool success, bytes memory returnData) = address(executor).delegatecall(
            abi.encodeWithSelector(
                tradeData.selector,
                tradeData.params  
            )
        );
        console.log("Core: Delegatecall success:", success);
        require(success, "DEX trade failed");
        
        uint256 amountOut = abi.decode(returnData, (uint256));
        require(amountOut > 0, "No tokens received from swap");

        if (sweetSpot == 1 || sweetSpot == 2 || sweetSpot == 3 || sweetSpot == 4) {
            sweetSpot--;
        }

        storageTrade.amountRemaining = trade.amountRemaining - streamVolume;
        storageTrade.realisedAmountOut += amountOut;
        storageTrade.lastSweetSpot = sweetSpot;
        storageTrade.cumulativeGasEntailed += uint96(gasCostInWei);

        emit TradeStreamExecuted(
            trade.tradeId,
            streamVolume,
            amountOut,
            storageTrade.cumulativeGasEntailed,
            sweetSpot
        );

        return storageTrade;
    }

        function instasettle(uint256 tradeId) external 
    // returns (bool) 
    {
        console.log("Instasettle: %s", tradeId);
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        // Legacy check for instasettleBps
        // require(trade.instasettleBps > 0, "Trade not instasettlable");
        require(trade.isInstasettlable, "Trade not instasettlable");
        console.log("Trade is instasettlable");

        // If lastSweetSpot == 1, just settle the amountRemaining
        if (trade.lastSweetSpot == 1) {
            delete trades[tradeId];
            bool statusIn = IERC20(trade.tokenOut).transferFrom(msg.sender, trade.owner, trade.realisedAmountOut);
            require(statusIn, "Instasettle: Failed to transfer tokens to trade owner");
            bool statusOut = IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining);
            require(statusOut, "Instasettle: Failed to transfer tokens to settler");
            emit TradeSettled(
                trade.tradeId,
                msg.sender,
                trade.amountRemaining,
                trade.realisedAmountOut,
                0 // totalFees is 0 in this case
            );
            return;
        }

        // Calculate remaining amount that needs to be settled
        uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
        require(remainingAmountOut > 0, "No remaining amount to settle");
        uint256 instasettleAmount = (remainingAmountOut * (10000 - trade.instasettleBps)) / 10000;

        delete trades[tradeId];
        bool statusIn = IERC20(trade.tokenOut).transferFrom(msg.sender, trade.owner, instasettleAmount);
        require(statusIn, "Instasettle: Failed to transfer tokens to trade owner");
        bool statusOut = IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining);
        require(statusOut, "Instasettle: Failed to transfer tokens to settler");
        emit TradeSettled(
            trade.tradeId,
            msg.sender,
            trade.amountRemaining,
            instasettleAmount,
            remainingAmountOut - instasettleAmount // totalFees is the difference
        );

        // return statusIn && statusOut;
    }

    // function instasettle(uint256 tradeId) public payable {
    //     // first we pull the trade from storage into memory
    //     Utils.Trade memory trade = trades[tradeId];
    //     // then we check if the trade is instasettlable
    //     if (trade.isInstasettlable) {
    //         // then we execute the stream
    //         require(
    //             _settleTrade(trade),
    //             /**
    //              * , tradePlacer
    //              */
    //             "Trade not settled"
    //         ); // parameter for tradePlacer temporarily subbed out until Router is implemented
    //     }
    //     // Emit Instasettled(tradeId);
    // }

    // function _settleTrade(Utils.Trade memory trade)
    //     /**
    //      * , address instasettler
    //      */
    //     internal
    //     returns (bool)
    // {
    //     // we need to ensure the amount of provided tokenIn satisfies the remainingTokenOut from the trade
    //     // if so, we execute a full trade swap (no streams)
    //     uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
    //     // then, we take the bps
    //     uint256 instasettleBps = trade.instasettleBps;
    //     uint256 instasettleAmount = trade.amountRemaining - (trade.amountRemaining * instasettleBps) / 10000;
    //     // if the instasettleAmount is less than the remainingAmountOut, we revert
    //     require(instasettleAmount >= remainingAmountOut, "Insufficient balance to settle trade");
    //     // if so, we execute a full trade swap (no streams)
    //     //first of course we remove the trade from storage
    //     delete trades[trade.tradeId];
    //     //then we initialise the interface
    //     IERC20 tokenOut = IERC20(trade.tokenOut);
    //     //then, we transfer money from the purchaser to the owner
    //     (bool statusIn) = tokenOut.transferFrom(msg.sender, trade.owner, instasettleAmount);
    //     //then, we transfer the remaining amount of tokenIn to the purchaser
    //     (bool statusOut) = IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining); // @audit we pass msg.sender here for testing without a Router, but we should have auth for Router access set up and the caller's address passed as a parameter from Router on this function call

    //     emit TradeSettled(
    //         trade.tradeId,
    //         msg.sender,
    //         trade.amountRemaining,
    //         instasettleAmount,
    //         trade.amountRemaining - instasettleAmount // totalFees is the difference
    //     );

    //     return statusIn == statusOut ? true : false;
    // }

    function getPairIdTradeIds(bytes32 pairId) external view returns (uint256[] memory) {
        return pairIdTradeIds[pairId];
    }

    function getTrade(uint256 tradeId) external view returns (Utils.Trade memory) {
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        return trade;
    }
}
