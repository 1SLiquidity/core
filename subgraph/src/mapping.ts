import {
  TradeCreated,
  TradeStreamExecuted,
  TradeCancelled,
  TradeSettled
} from '../generated/Core/Core'
import {
  InstaSettleConfigured
} from '../generated/Router/Router'
import {
  DEXRouteAdded,
  DEXRouteRemoved
} from '../generated/StreamDaemon/StreamDaemon'
import {
  FeesClaimed
} from '../generated/Fees/Fees'
import {
  Trade,
  TradeExecution,
  TradeCancellation,
  TradeSettlement,
  InstaSettleConfig,
  DEXRoute,
  FeeClaim
} from '../generated/schema'
import { BigInt, Bytes } from '@graphprotocol/graph-ts'

export function handleTradeCreated(event: TradeCreated): void {
  let trade = new Trade(event.params.tradeId.toString())
  trade.tradeId = event.params.tradeId
  trade.user = event.params.user
  trade.tokenIn = event.params.tokenIn
  trade.tokenOut = event.params.tokenOut
  trade.amountIn = event.params.amountIn
  trade.amountRemaining = event.params.amountRemaining
  trade.minAmountOut = event.params.minAmountOut
  trade.realisedAmountOut = event.params.realisedAmountOut
  trade.isInstasettlable = event.params.isInstasettlable
  trade.instasettleBps = event.params.instasettleBps
  trade.botGasAllowance = event.params.botGasAllowance
  trade.cumulativeGasEntailed = event.params.cumulativeGasEntailed
  trade.lastSweetSpot = event.params.lastSweetSpot
  trade.createdAt = event.block.timestamp
  trade.save()
}

export function handleTradeStreamExecuted(event: TradeStreamExecuted): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let execution = new TradeExecution(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  execution.trade = trade.id
  execution.amountIn = event.params.amountIn
  execution.realisedAmountOut = event.params.realisedAmountOut
  execution.cumulativeGasEntailed = event.params.cumulativeGasEntailed
  execution.lastSweetSpot = event.params.lastSweetSpot
  execution.timestamp = event.block.timestamp
  execution.save()

  // Update trade state
  trade.amountRemaining = trade.amountRemaining.minus(event.params.amountIn)
  trade.realisedAmountOut = trade.realisedAmountOut.plus(event.params.realisedAmountOut)
  trade.cumulativeGasEntailed = event.params.cumulativeGasEntailed
  trade.lastSweetSpot = event.params.lastSweetSpot
  trade.save()
}

export function handleTradeCancelled(event: TradeCancelled): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let cancellation = new TradeCancellation(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  cancellation.trade = trade.id
  cancellation.amountRemaining = event.params.amountRemaining
  cancellation.realisedAmountOut = event.params.realisedAmountOut
  cancellation.timestamp = event.block.timestamp
  cancellation.save()

  // Update trade state
  trade.amountRemaining = event.params.amountRemaining
  trade.realisedAmountOut = event.params.realisedAmountOut
  trade.save()
}

export function handleTradeSettled(event: TradeSettled): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let settlement = new TradeSettlement(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  settlement.trade = trade.id
  settlement.settler = event.params.settler
  settlement.totalAmountIn = event.params.totalAmountIn
  settlement.totalAmountOut = event.params.totalAmountOut
  settlement.totalFees = event.params.totalFees
  settlement.timestamp = event.block.timestamp
  settlement.save()

  // Update trade state
  trade.amountRemaining = BigInt.fromI32(0)
  trade.realisedAmountOut = event.params.totalAmountOut
  trade.save()
}

export function handleInstaSettleConfigured(event: InstaSettleConfigured): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let config = new InstaSettleConfig(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  config.trade = trade.id
  config.enabled = event.params.enabled
  config.instasettleBps = event.params.instasettleBps
  config.timestamp = event.block.timestamp
  config.save()

  // Update trade state
  trade.isInstasettlable = event.params.enabled
  trade.instasettleBps = event.params.instasettleBps
  trade.save()
}

export function handleDEXRouteAdded(event: DEXRouteAdded): void {
  let dexRoute = new DEXRoute(event.params.dex.toHexString())
  dexRoute.dex = event.params.dex
  dexRoute.isActive = true
  dexRoute.addedAt = event.block.timestamp
  dexRoute.removedAt = null
  dexRoute.save()
}

export function handleDEXRouteRemoved(event: DEXRouteRemoved): void {
  let dexRoute = DEXRoute.load(event.params.dex.toHexString())
  if (dexRoute == null) return

  dexRoute.isActive = false
  dexRoute.removedAt = event.block.timestamp
  dexRoute.save()
}

export function handleFeesClaimed(event: FeesClaimed): void {
  let feeClaim = new FeeClaim(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  feeClaim.bot = event.params.bot
  feeClaim.feeToken = event.params.feeToken
  feeClaim.amount = event.params.amount
  feeClaim.timestamp = event.block.timestamp
  feeClaim.save()
} 