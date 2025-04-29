import { ethers } from 'ethers';
import { PriceResult } from '../types/price';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, COMMON } from '../config/dex';
import { ReserveResult } from '../types/reserves';

export class UniswapV2Service {
  private router: ethers.Contract;
  private factory: ethers.Contract;
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.router = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER,
      CONTRACT_ABIS.UNISWAP_V2.ROUTER,
      provider
    );
    this.factory = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V2.FACTORY,
      CONTRACT_ABIS.UNISWAP_V2.FACTORY,
      provider
    );
  }

  async getReserves(tokenA: string, tokenB: string): Promise<ReserveResult | null> {
    try {
      const pairAddress = await this.factory.getPair(tokenA, tokenB);
      if (pairAddress === COMMON.ZERO_ADDRESS) {
        return null;
      }

      const pair = new ethers.Contract(pairAddress, CONTRACT_ABIS.UNISWAP_V2.PAIR, this.provider);
      const [reserve0, reserve1] = await pair.getReserves();
      const token0 = await pair.token0();

      return {
        dex: 'uniswap-v2',
        pairAddress,
        reserves: {
          token0: reserve0.toString(),
          token1: reserve1.toString()
        }
      };
    } catch (error) {
      console.error('Error fetching Uniswap V2 reserves:', error);
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

      // Get reserves
      const pair = new ethers.Contract(pairAddress, CONTRACT_ABIS.UNISWAP_V2.PAIR, this.provider);
      const [reserve0, reserve1] = await pair.getReserves();

      // Calculate price
      const path = [tokenA, tokenB];
      const amountIn = COMMON.parseEther('1'); // 1 token
      const amounts = await this.router.getAmountsOut(amountIn, path);
      const price = COMMON.formatEther(amounts[1]);

      return {
        dex: 'uniswap-v2',
        price,
        liquidity: COMMON.formatEther(reserve0),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Uniswap V2 price fetch failed:', error);
      return null;
    }
  }
} 