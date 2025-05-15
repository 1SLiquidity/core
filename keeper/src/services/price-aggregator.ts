import { ethers } from 'ethers';
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex';
import { PriceResult } from '../types/price';

export type DexType = 'uniswapV2' | 'uniswapV3_500' | 'uniswapV3_3000' | 'uniswapV3_10000' | 'sushiswap';

export class PriceAggregator {
  private uniswapV2: UniswapV2Service;
  private uniswapV3_500: UniswapV3Service;
  private uniswapV3_3000: UniswapV3Service;
  private uniswapV3_10000: UniswapV3Service;
  private sushiswap: SushiSwapService;

  constructor(provider: ethers.Provider) {
    this.uniswapV2 = new UniswapV2Service(provider);
    this.uniswapV3_500 = new UniswapV3Service(provider);
    this.uniswapV3_3000 = new UniswapV3Service(provider);
    this.uniswapV3_10000 = new UniswapV3Service(provider);
    this.sushiswap = new SushiSwapService(provider);
  }

  // Helper method for fetching with retries
  private async fetchWithRetry(
    fetchFn: () => Promise<PriceResult | null>,
    name: string,
    maxRetries = 2,
    delay = 1000
  ): Promise<PriceResult | null> {
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        return await fetchFn();
      } catch (error) {
        if (retries === maxRetries) {
          console.error(`Failed to fetch ${name} price after ${maxRetries} retries`);
          return null;
        }
        console.log(`Retrying ${name} price fetch (${retries + 1}/${maxRetries})...`);
        retries++;
        // Simple delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  async getPriceFromDex(tokenA: string, tokenB: string, dex: DexType): Promise<PriceResult | null> {
    switch (dex) {
      case 'uniswapV2':
        return await this.fetchWithRetry(
          () => this.uniswapV2.getPrice(tokenA, tokenB),
          'Uniswap V2'
        );
      case 'uniswapV3_500':
        return await this.fetchWithRetry(
          () => this.uniswapV3_500.getPrice(tokenA, tokenB, 500),
          'Uniswap V3 (500)'
        );
      case 'uniswapV3_3000':
        return await this.fetchWithRetry(
          () => this.uniswapV3_3000.getPrice(tokenA, tokenB, 3000),
          'Uniswap V3 (3000)'
        );
      case 'uniswapV3_10000':
        return await this.fetchWithRetry(
          () => this.uniswapV3_10000.getPrice(tokenA, tokenB, 10000),
          'Uniswap V3 (10000)'
        );
      case 'sushiswap':
        return await this.fetchWithRetry(
          () => this.sushiswap.getPrice(tokenA, tokenB),
          'SushiSwap'
        );
      default:
        throw new Error(`Unsupported DEX type: ${dex}`);
    }
  }

  async getAllPrices(tokenA: string, tokenB: string): Promise<PriceResult[]> {
    const results: PriceResult[] = [];

    // Fetch data sequentially instead of in parallel to avoid rate limits
    console.log('Fetching Uniswap V3 (500) price...');
    const uniswapV3_500Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswapV3_500');
    if (uniswapV3_500Price) results.push(uniswapV3_500Price);

    console.log('Fetching Uniswap V3 (3000) price...');
    const uniswapV3_3000Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswapV3_3000');
    if (uniswapV3_3000Price) results.push(uniswapV3_3000Price);

    console.log('Fetching Uniswap V3 (10000) price...');
    const uniswapV3_10000Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswapV3_10000');
    if (uniswapV3_10000Price) results.push(uniswapV3_10000Price);

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('Fetching Uniswap V2 price...');
    const uniswapV2Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswapV2');
    if (uniswapV2Price) results.push(uniswapV2Price);

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('Fetching SushiSwap price...');
    const sushiswapPrice = await this.getPriceFromDex(tokenA, tokenB, 'sushiswap');
    if (sushiswapPrice) results.push(sushiswapPrice);

    return results;
  }
} 