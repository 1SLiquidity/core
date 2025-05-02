export interface ReserveResult {
  dex: string;
  pairAddress: string;
  reserves: {
    token0: string;
    token1: string;
  };
  timestamp: number;
} 