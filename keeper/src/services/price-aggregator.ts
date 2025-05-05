import { ethers } from 'ethers';
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex';
import { PriceResult } from '../types/price';

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

  async getAllPrices(tokenA: string, tokenB: string): Promise<PriceResult[]> {
    const results: PriceResult[] = [];

    // Query all DEXes in parallel
    const [uniswapV2Price, uniswapV3_500Price, uniswapV3_3000Price, uniswapV3_10000Price, sushiswapPrice] = await Promise.all([
      this.uniswapV2.getPrice(tokenA, tokenB),
      this.uniswapV3_500.getPrice(tokenA, tokenB, 500),
      this.uniswapV3_3000.getPrice(tokenA, tokenB, 3000),
      this.uniswapV3_10000.getPrice(tokenA, tokenB, 10000),
      this.sushiswap.getPrice(tokenA, tokenB)
    ]);

    // Add valid results
    if (uniswapV2Price) results.push(uniswapV2Price);
    if (uniswapV3_500Price) results.push(uniswapV3_500Price);
    if (uniswapV3_3000Price) results.push(uniswapV3_3000Price);
    if (uniswapV3_10000Price) results.push(uniswapV3_10000Price);
    if (sushiswapPrice) results.push(sushiswapPrice);

    return results;
  }

  async getBidirectionalPrices(tokenA: string, tokenB: string): Promise<{
    forward: PriceResult[];
    reverse: PriceResult[];
  }> {
    const [forwardPrices, reversePrices] = await Promise.all([
      this.getAllPrices(tokenA, tokenB),
      this.getAllPrices(tokenB, tokenA)
    ]);

    return {
      forward: forwardPrices,
      reverse: reversePrices
    };
  }
} 