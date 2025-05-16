export interface ReserveResult {
  dex: string;
  pairAddress: string;
  reserves: {
    token0: string;
    token1: string;
  };
  decimals: {
    token0: number;
    token1: number;
  };
  timestamp: number;
} 