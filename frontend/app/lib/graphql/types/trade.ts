export interface Execution {
  amountIn: string
  cumulativeGasEntailed: string
  id: string
  lastSweetSpot: string
  timestamp: string
  realisedAmountOut: string
}

export interface Trade {
  amountIn: string
  amountRemaining: string
  botGasAllowance: string
  createdAt: string
  cumulativeGasEntailed: string
  instasettleBps: string
  isInstasettlable: boolean
  lastSweetSpot: string
  minAmountOut: string
  tokenIn: string
  tokenOut: string
  tradeId: string
  user: string
  realisedAmountOut: string
  id: string
  executions: Execution[]
  // Calculated fields
  effectivePrice?: number
  networkFee?: number
  amountOutSavings?: number
  totalSavings?: number
  amountInUsd?: number
  tokenInDetails?: any // Using any for now since we don't have the token type here
  tokenOutDetails?: any // Using any for now since we don't have the token type here
}

export interface TradesResponse {
  trades: Trade[]
}
