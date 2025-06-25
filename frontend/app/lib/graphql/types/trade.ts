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
}

export interface TradesResponse {
  trades: Trade[]
}
