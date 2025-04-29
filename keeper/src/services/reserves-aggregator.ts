import { ethers } from 'ethers';
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex';
import { ReserveResult } from '../types/reserves';

export class ReservesAggregator {
  private uniswapV2: UniswapV2Service;
  private uniswapV3: UniswapV3Service;
  private sushiswap: SushiSwapService;

  constructor(provider: ethers.Provider) {
    this.uniswapV2 = new UniswapV2Service(provider);
    this.uniswapV3 = new UniswapV3Service(provider);
    this.sushiswap = new SushiSwapService(provider);
  }

  async getAllReserves(tokenA: string, tokenB: string): Promise<ReserveResult[]> {
    const results: ReserveResult[] = [];

    // Query all DEXes in parallel
    const [uniswapV2Reserves, uniswapV3Reserves, sushiswapReserves] = await Promise.all([
      this.uniswapV2.getReserves(tokenA, tokenB),
      this.uniswapV3.getReserves(tokenA, tokenB),
      this.sushiswap.getReserves(tokenA, tokenB)
    ]);

    // Add valid results
    if (uniswapV2Reserves) results.push(uniswapV2Reserves);
    if (uniswapV3Reserves) results.push(...uniswapV3Reserves);
    if (sushiswapReserves) results.push(sushiswapReserves);

    return results;
  }
} 