import { ethers } from 'ethers';
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex';
import { ReserveResult } from '../types/reserves';

export class ReservesAggregator {
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

  async getAllReserves(tokenA: string, tokenB: string): Promise<ReserveResult[]> {
    const results: ReserveResult[] = [];

    // Query all DEXes in parallel
    const [uniswapV2Reserves, uniswapV3_500Reserves, uniswapV3_3000Reserves, uniswapV3_10000Reserves, sushiswapReserves] = await Promise.all([
      this.uniswapV2.getReserves(tokenA, tokenB),
      this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
      this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
      this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
      this.sushiswap.getReserves(tokenA, tokenB)
    ]);

    // Add valid results
    if (uniswapV2Reserves) results.push(uniswapV2Reserves);
    if (uniswapV3_500Reserves) results.push(uniswapV3_500Reserves);
    if (uniswapV3_3000Reserves) results.push(uniswapV3_3000Reserves);
    if (uniswapV3_10000Reserves) results.push(uniswapV3_10000Reserves);
    if (sushiswapReserves) results.push(sushiswapReserves);

    return results;
  }
} 