// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
// import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import "./StreamDaemon.sol";
import "./Executor.sol";
import "./Utils.sol";
import "./interfaces/IRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "forge-std/console.sol";

contract Core is Ownable /*, UUPSUpgradeable */ {
    using SafeERC20 for IERC20;

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
        uint256 lastSweetSpot
    );

    event TradeStreamExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 realisedAmountOut,
        uint256 lastSweetSpot
    );

    event TradeCancelled(uint256 indexed tradeId, uint256 amountRemaining, uint256 realisedAmountOut);

    event TradeSettled(
        uint256 indexed tradeId,
        address indexed settler,
        uint256 totalAmountIn,
        uint256 totalAmountOut,
        uint256 totalFees
    );

    // =========================
    // Fees state
    // =========================
    uint16 public constant MAX_BPS = 10000;
    uint16 public constant MAX_FEE_CAP_BPS = 100; // 1%
    uint16 public streamProtocolFeeBps = 10; // 10 bps
    uint16 public streamBotFeeBps = 10;      // 10 bps
    uint16 public instasettleProtocolFeeBps = 10; // 10 bps

    // Protocol fee balances by token
    mapping(address => uint256) public protocolFees;

    // Fees events
    event StreamFeesTaken(
        uint256 indexed tradeId,
        address indexed bot,
        address indexed token,
        uint256 protocolFee,
        uint256 botFee
    );
    event InstasettleFeeTaken(
        uint256 indexed tradeId,
        address indexed settler,
        address indexed token,
        uint256 protocolFee
    );
    event FeesClaimed(
        address indexed recipient,
        address indexed token,
        uint256 amount,
        bool isProtocol
    );
    event FeeRatesUpdated(
        uint16 streamProtocolFeeBps,
        uint16 streamBotFeeBps,
        uint16 instasettleProtocolFeeBps
    );

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
        address _registry
    ) Ownable(msg.sender) {
        streamDaemon = StreamDaemon(_streamDaemon);
        executor = Executor(_executor);
        registry = IRegistry(_registry);
    }

    // function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // =========================
    // Fees admin
    // =========================
    function setStreamProtocolFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        streamProtocolFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function setStreamBotFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        streamBotFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function setInstasettleProtocolFeeBps(uint16 bps) external onlyOwner {
        require(bps <= MAX_FEE_CAP_BPS, "fee cap");
        instasettleProtocolFeeBps = bps;
        emit FeeRatesUpdated(streamProtocolFeeBps, streamBotFeeBps, instasettleProtocolFeeBps);
    }

    function claimProtocolFees(address token) external onlyOwner {
        uint256 amount = protocolFees[token];
        require(amount > 0, "no fees");
        protocolFees[token] = 0;
        IERC20(token).transfer(owner(), amount);
        emit FeesClaimed(owner(), token, amount, true);
    }

    // =========================
    // Fees helpers
    // =========================
    function _computeFee(uint256 amount, uint16 bps) internal pure returns (uint256) {
        return (amount * bps) / MAX_BPS;
    }

    function _applyStreamFees(
        uint256 tradeId,
        address tokenOut,
        uint256 deltaOut,
        bool isInitial,
        address bot
    ) internal returns (uint256 protocolFee, uint256 botFee) {
        if (deltaOut == 0) {
            return (0, 0);
        }
        protocolFee = _computeFee(deltaOut, streamProtocolFeeBps);
        botFee = _computeFee(deltaOut, streamBotFeeBps);
        if (isInitial) {
            protocolFee += botFee;
            botFee = 0;
        }
        // Guard: bot fee cannot exceed 100 bps of delta
        require(botFee * MAX_BPS <= deltaOut * 100, "bot fee guard");
        protocolFees[tokenOut] += protocolFee;
        emit StreamFeesTaken(tradeId, bot, tokenOut, protocolFee, botFee);
    }

    function placeTrade(bytes calldata tradeData) public payable {
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOutMin,
            bool isInstasettlable
        ) = abi.decode(tradeData, (address, address, uint256, uint256, bool));
        // @audit may be better to abstract sweetSpot algo to here and pass the value along, since small (<0.001% pool depth) trades shouldn't be split at all and would save hefty logic
        // @audit edge cases wrt pool depths (specifically extremely small volume to volume reserves) create anomalies in the algo output
        // @audit similarly for the sake of OPTIMISTIC and DETERMINISTIC placement patterns, we should abstract the calculation of sweetSpot nad the definition of appropriate DEX into seperated, off contract functions
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        uint256 tradeId = lastTradeId++;
        bytes32 pairId = keccak256(abi.encode(tokenIn, tokenOut)); //@audit optimise this

        // @audit needs attention for small trades - these hsouldn't be entered in the orderbook / storage
        trades[tradeId] = Utils.Trade({
            owner: msg.sender,
            attempts: 1,
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountIn: amountIn,
            amountRemaining: amountIn,
            targetAmountOut: amountOutMin,
            realisedAmountOut: 0,
            tradeId: tradeId,
            instasettleBps: 100,
            lastSweetSpot: 0, // @audit check that we need to speficially evaluate this here
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
            4 // lastSweetSpot default
        );

        Utils.Trade storage trade = trades[tradeId];
        uint256 realisedBefore = trade.realisedAmountOut;
        _executeStream(trade);
        uint256 delta = trade.realisedAmountOut - realisedBefore; // initial delta = realised
        if (delta > 0) {
            (uint256 protocolFee, uint256 botFee) = _applyStreamFees(tradeId, tokenOut, delta, true, address(0));
            trades[tradeId].realisedAmountOut = trade.realisedAmountOut - (protocolFee + botFee);
        }
    }

    function _removeTradeIdFromArray(bytes32 pairId, uint256 tradeId) internal {
        uint256[] storage tradeIds = pairIdTradeIds[pairId];
        for (uint256 i = 0; i < tradeIds.length; i++) {
            if (tradeIds[i] == tradeId) {
                // Remove the trade ID by moving the last element to this position and popping
                if (i < tradeIds.length - 1) {
                    tradeIds[i] = tradeIds[tradeIds.length - 1];
                }
                tradeIds.pop();
                break;
            }
        }
    }

    function _cancelTrade(uint256 tradeId) public returns (bool) {
        // @audit It is essential that this authority may be granted by a bot, therefore meaning if the msg.sender is
        // Core.
        // @audit Similarly, when the Router is implemented, we mnust forward the msg.sender in the function call /
        // veridy signed message
        Utils.Trade memory trade = trades[tradeId];
        if (trade.owner == address(0)) {
            revert("Trade does not exist");
        }
        if (trade.owner == msg.sender || msg.sender == address(this) || trade.attempts >= 3) {
            bytes32 pairId = keccak256(abi.encode(trade.tokenIn, trade.tokenOut));
            delete trades[tradeId];
            _removeTradeIdFromArray(pairId, tradeId);
            IERC20(trade.tokenOut).safeTransfer(msg.sender, trade.realisedAmountOut);
            IERC20(trade.tokenIn).safeTransfer(msg.sender, trade.amountRemaining);

            emit TradeCancelled(tradeId, trade.amountRemaining, trade.realisedAmountOut);

            return true;
        } else {
            revert("Only trade owner can cancel");
        }
    }

    function executeTrades(bytes32 pairId) public {
        uint256[] storage tradeIds = pairIdTradeIds[pairId];
        uint256 botFeesAccrued = 0;
        address tokenOutForRun = address(0);

        for (uint256 i = 0; i < tradeIds.length; i++) {
            Utils.Trade storage trade = trades[tradeIds[i]];

            console.log("[executeTrades] TradeId:");
            console.log(trade.tradeId);
            console.log("attempts:");
            console.log(trade.attempts);
            console.log("amountRemaining:");
            console.log(trade.amountRemaining);
            console.log("lastSweetSpot:");
            console.log(trade.lastSweetSpot);

            if (trade.attempts >= 3) {
                console.log("Core: executeTrades: trade attempts > 3");
                // we delete the trade from storage
                _cancelTrade(trade.tradeId);
            } else {
                uint256 realisedBefore = trade.realisedAmountOut;
                try this._executeStream(trade) returns (Utils.Trade memory updatedTrade) {
                    console.log("[executeTrades] After _executeStream: amountRemaining:");
                    console.log(updatedTrade.amountRemaining);
                    console.log("lastSweetSpot:");
                    console.log(updatedTrade.lastSweetSpot);
                    uint256 delta = updatedTrade.realisedAmountOut - realisedBefore;
                    if (delta > 0) {
                        if (tokenOutForRun == address(0)) tokenOutForRun = updatedTrade.tokenOut;
                        (uint256 protocolFee, uint256 botFee) = _applyStreamFees(trade.tradeId, updatedTrade.tokenOut, delta, false, msg.sender);
                        trades[trade.tradeId].realisedAmountOut = updatedTrade.realisedAmountOut - (protocolFee + botFee);
                        botFeesAccrued += botFee;
                    }
                    if (updatedTrade.lastSweetSpot == 0) {
                        console.log("Core: executeTrades: lastSweetSpot == 0");
                        IERC20(trade.tokenOut).transfer(trade.owner, trade.realisedAmountOut);
                        delete trades[tradeIds[i]];
                        _removeTradeIdFromArray(pairId, tradeIds[i]);
                        console.log("[executeTrades] : trade completed");
                    }
                } catch Error(string memory reason) {
                    console.log("[executeTrades] Error:");
                    console.log(reason);
                    trade.attempts++;
                } catch (bytes memory lowLevelData) {
                    console.log("[executeTrades] trade failed");
                    console.log(string(lowLevelData));
                    trade.attempts++;
                }
            }
        }

        if (botFeesAccrued > 0) {
            require(tokenOutForRun != address(0), "fee token unset");
            IERC20(tokenOutForRun).transfer(msg.sender, botFeesAccrued);
            emit FeesClaimed(msg.sender, tokenOutForRun, botFeesAccrued, false);
        }
    }

    function _executeStream(Utils.Trade memory trade) public returns (Utils.Trade memory updatedTrade) {
        console.log("Executing stream for trade");
        console.log(trade.tradeId);
        
        Utils.Trade storage storageTrade = trades[trade.tradeId];
        
        // security measure @audit may need review
        // if (trade.realisedAmountOut > trade.targetAmountOut) {
        //     console.log("[_executeStream] ToxicTrade: realisedAmountOut > targetAmountOut");
        //     revert ToxicTrade(trade.tradeId);
        // }

        (uint256 sweetSpot, address bestDex, address router) = 
            streamDaemon.evaluateSweetSpotAndDex(trade.tokenIn, trade.tokenOut, trade.amountRemaining, 0);
        console.log("[_executeStream] algo calculated sweetSpot:");
        console.log(sweetSpot);
        console.log("execute stream: last sweet spot = ");
        console.log(trade.lastSweetSpot);
        console.log("evaluating conditions");

        if (trade.lastSweetSpot == 1 || trade.lastSweetSpot == 2 || trade.lastSweetSpot == 3 || trade.lastSweetSpot == 4) {
        console.log("low sweet spot condition being looked at");
            
            sweetSpot = trade.lastSweetSpot;

        }
        console.log("low sweet spot condition evaluated");

        if (sweetSpot > 500) {
        console.log("high sweet spot condition being looked at");

            sweetSpot = 500; // this is an arbitrary value @audit needs revision
        }
        console.log("high sweet spot condition evaluated");

        require(sweetSpot > 0, "Invalid sweet spot");
        uint256 targetAmountOut;
        uint256 streamVolume;
        if (trade.targetAmountOut > trade.realisedAmountOut) {
        targetAmountOut = (trade.targetAmountOut - trade.realisedAmountOut) / sweetSpot; // big change exists here
        streamVolume = trade.amountRemaining / sweetSpot;
        } else {
        targetAmountOut = trade.realisedAmountOut - trade.targetAmountOut;
        sweetSpot = 1;
        streamVolume = trade.amountRemaining;
        }
        console.log("[_executeStream] streamVolume:");
        console.log(streamVolume);
        console.log("targetAmountOut:");
        console.log(targetAmountOut);

        IRegistry.TradeData memory tradeData = registry.prepareTradeData(
            bestDex, trade.tokenIn, trade.tokenOut, streamVolume, targetAmountOut, address(this)
        );
        console.log("Core: Trade data prepared");

        IERC20(trade.tokenIn).forceApprove(tradeData.router, streamVolume);
        console.log("Core: Router approved");

        (bool success, bytes memory returnData) = address(executor).delegatecall(
            abi.encodeWithSelector(
                tradeData.selector,
                tradeData.params  
            )
        );
        console.log("Core: Delegatecall success:");
        console.log(success);
        if (!success) {
            console.log("[_executeStream] Delegatecall failed");
            revert("DEX trade failed");
        }
        uint256 amountOut = abi.decode(returnData, (uint256));
        require(amountOut > 0, "No tokens received from swap");

        if (sweetSpot == 1 || sweetSpot == 2 || sweetSpot == 3 || sweetSpot == 4) {
            sweetSpot--;
        }

        storageTrade.amountRemaining = trade.amountRemaining - streamVolume;
        storageTrade.realisedAmountOut += amountOut;
        storageTrade.lastSweetSpot = sweetSpot;

        console.log("[_executeStream] Post-update: amountRemaining:");
        console.log(storageTrade.amountRemaining);
        console.log("realisedAmountOut:");
        console.log(storageTrade.realisedAmountOut);
        console.log("Execute Trades: sweet spot decrimented. Value is: ");
        console.log(storageTrade.lastSweetSpot);
        console.log("EXECUTE TRADES: ONE STREAM EXECUTED");

        emit TradeStreamExecuted(
            trade.tradeId,
            streamVolume,
            amountOut,
            sweetSpot
        );

        return storageTrade;
    }

    function instasettle(uint256 tradeId) external {
        console.log("Instasettle: %s", tradeId);
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        require(trade.isInstasettlable, "Trade not instasettlable");
        console.log("Trade is instasettlable");

        // If lastSweetSpot == 1, just settle the amountRemaining
        if (trade.lastSweetSpot == 1) {
            console.log("Instasettle: lastSweetSpot == 1");
            delete trades[tradeId];
            bool statusIn1 = IERC20(trade.tokenOut).transferFrom(msg.sender, trade.owner, trade.realisedAmountOut);
            require(statusIn1, "Instasettle: Failed to transfer tokens to trade owner");
            bool statusOut1 = IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining);
            require(statusOut1, "Instasettle: Failed to transfer tokens to settler");
            emit TradeSettled(
                trade.tradeId,
                msg.sender,
                trade.amountRemaining,
                trade.realisedAmountOut,
                0 // totalFees is 0 in this case
            );
            return;
        }
        console.log("Instasettle: lastSweetSpot != 1");

        // Calculate remaining amount that needs to be settled
        uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
        require(remainingAmountOut > 0, "No remaining amount to settle");
        
        // Calculate how much the settler should pay
        // targetAmountOut - (realisedAmountOut * (1 - instasettleBps/10000))
        uint256 settlerPayment = ((trade.targetAmountOut - trade.realisedAmountOut) * (10000 - trade.instasettleBps)) / 10000;
        console.log("Instasettle: settlerPayment: %s", settlerPayment);

        // Take protocol fee from settler on instasettle
        uint256 protocolFee = _computeFee(settlerPayment, instasettleProtocolFeeBps);
        if (protocolFee > 0) {
            bool feePull = IERC20(trade.tokenOut).transferFrom(msg.sender, address(this), protocolFee);
            require(feePull, "Instasettle: fee pull failed");
            protocolFees[trade.tokenOut] += protocolFee;
            emit InstasettleFeeTaken(trade.tradeId, msg.sender, trade.tokenOut, protocolFee);
        }

        delete trades[tradeId];
        bool statusIn = IERC20(trade.tokenOut).transferFrom(msg.sender, trade.owner, settlerPayment);
        require(statusIn, "Instasettle: Failed to transfer tokens to trade owner");
        console.log("Instasettle: statusIn: %s", statusIn);
        bool statusOut = IERC20(trade.tokenIn).transfer(msg.sender, trade.amountRemaining);
        require(statusOut, "Instasettle: Failed to transfer tokens to settler");
        console.log("Instasettle: statusOut: %s", statusOut);
        emit TradeSettled(
            trade.tradeId,
            msg.sender,
            trade.amountRemaining,
            settlerPayment,
            remainingAmountOut - settlerPayment // totalFees is the difference (logical fee notion)
        );
        console.log("Instasettle: TradeSettle Event Emitted");
    }

    function getPairIdTradeIds(bytes32 pairId) external view returns (uint256[] memory) {
        return pairIdTradeIds[pairId];
    }

    function getTrade(uint256 tradeId) external view returns (Utils.Trade memory) {
        Utils.Trade memory trade = trades[tradeId];
        require(trade.owner != address(0), "Trade not found");
        return trade;
    }
}
