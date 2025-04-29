export interface PriceResult {
  dex: string;
  price: string;
  liquidity: string;
  timestamp: number;
}

export interface PriceData {
  dex: string;
  price: string;
  liquidity: string;
  path: string[];
  timestamp: number;
} 