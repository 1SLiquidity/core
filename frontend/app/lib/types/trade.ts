export interface Trade {
  invoice: string
  action: string
  amount1: string
  amount2: string
  quantity: string
  duration: string
  value: string
  isOwner: boolean
  timestamp: number // Unix timestamp in milliseconds
}

export interface ChartDataPoint {
  volume: number
  streams: number
  trade: Trade
}
