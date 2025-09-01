export interface ReserveResult {
  dex: string
  pairAddress: string
  reserves: {
    token0: string
    token1: string
  }
  decimals: {
    token0: number
    token1: number
  }
  timestamp: number
  // Optional fields for aggregated data (only present in getAllReserves)
  totalReserves?: {
    totalReserveTokenA: string
    totalReserveTokenB: string
  }
}
