export interface TokenInfo {
  address: string;
  decimals: number;
  symbol: string;
}

export interface TokenPair {
  token0: TokenInfo;
  token1: TokenInfo;
} 