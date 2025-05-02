import { ethers } from 'ethers';
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex';
import { PriceResult } from '../types/price';

export class PriceAggregator {
  private uniswapV2: UniswapV2Service;
  private uniswapV3: UniswapV3Service;
  private sushiswap: SushiSwapService;

  constructor(provider: ethers.Provider) {
    this.uniswapV2 = new UniswapV2Service(provider);
    this.uniswapV3 = new UniswapV3Service(provider);
    this.sushiswap = new SushiSwapService(provider);
  }

  async getAllPrices(tokenA: string, tokenB: string): Promise<PriceResult[]> {
    const results: PriceResult[] = [];

    // Query all DEXes in parallel
    const [uniswapV2Price, uniswapV3Price, sushiswapPrice] = await Promise.all([
      this.uniswapV2.getPrice(tokenA, tokenB),
      this.uniswapV3.getPrice(tokenA, tokenB),
      this.sushiswap.getPrice(tokenA, tokenB)
    ]);

    // Add valid results
    if (uniswapV2Price) results.push(uniswapV2Price);
    if (uniswapV3Price) results.push(uniswapV3Price);
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