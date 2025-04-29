import { ethers } from 'ethers';
import { PriceResult } from '../types/price';
import { ReserveResult } from '../types/reserves';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, COMMON } from '../config/dex';

export class SushiSwapService {
  private router: ethers.Contract;
  private factory: ethers.Contract;
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.router = new ethers.Contract(
      CONTRACT_ADDRESSES.SUSHISWAP.ROUTER,
      CONTRACT_ABIS.SUSHISWAP.ROUTER,
      provider
    );
    this.factory = new ethers.Contract(
      CONTRACT_ADDRESSES.SUSHISWAP.FACTORY,
      CONTRACT_ABIS.SUSHISWAP.FACTORY,
      provider
    );
  }

  async getReserves(tokenA: string, tokenB: string): Promise<ReserveResult | null> {
    try {
      const pairAddress = await this.factory.getPair(tokenA, tokenB);
      if (pairAddress === COMMON.ZERO_ADDRESS) {
        return null;
      }

      const pair = new ethers.Contract(pairAddress, CONTRACT_ABIS.SUSHISWAP.PAIR, this.provider);
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();

      return {
        dex: 'sushiswap',
        pairAddress,
        reserves: {
          token0: reserve0.toString(),
          token1: reserve1.toString()
        }
      };
    } catch (error) {
      console.error('Error fetching SushiSwap reserves:', error);
      return null;
    }
  }

  async getPrice(tokenA: string, tokenB: string): Promise<PriceResult | null> {
    try {
      // Check if pair exists
      const pairAddress = await this.factory.getPair(tokenA, tokenB);
      if (pairAddress === COMMON.ZERO_ADDRESS) {
        return null;
      }

      // Get pair data
      const pair = new ethers.Contract(pairAddress, CONTRACT_ABIS.SUSHISWAP.PAIR, this.provider);
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();
      const token1 = await pair.token1();

      // Calculate price using router
      const amountIn = COMMON.parseEther('1'); // 1 token
      const amounts = await this.router.getAmountsOut(amountIn, [tokenA, tokenB]);
      const price = COMMON.formatEther(amounts[1]);

      // Calculate liquidity
      const liquidity = token0 === tokenA ? reserve0 : reserve1;

      return {
        dex: 'sushiswap',
        price,
        liquidity: COMMON.formatEther(liquidity),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('SushiSwap price fetch failed:', error);
      return null;
    }
  }
} 