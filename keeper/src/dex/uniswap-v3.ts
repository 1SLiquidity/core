import { ethers } from 'ethers';
import { PriceResult } from '../types/price';
import { ReserveResult } from '../types/reserves';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, COMMON } from '../config/dex';

export class UniswapV3Service {
  private factory: ethers.Contract;
  private quoter: ethers.Contract;
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.factory = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V3.FACTORY,
      CONTRACT_ABIS.UNISWAP_V3.FACTORY,
      provider
    );
    this.quoter = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
      CONTRACT_ABIS.UNISWAP_V3.QUOTER,
      provider
    );
  }

  async getReserves(tokenA: string, tokenB: string): Promise<ReserveResult[]> {
    const results: ReserveResult[] = [];
    try {
      // Try different fee tiers
      const feeTiers = [500, 3000, 10000];
      for (const fee of feeTiers) {
        const poolAddress = await this.factory.getPool(tokenA, tokenB, fee);
        if (poolAddress !== COMMON.ZERO_ADDRESS) {
          const pool = new ethers.Contract(poolAddress, CONTRACT_ABIS.UNISWAP_V3.POOL, this.provider);
          const liquidity = await pool.liquidity();
          
          results.push({
            dex: `uniswap-v3-${fee}`,
            pairAddress: poolAddress,
            reserves: {
              token0: liquidity.toString(),
              token1: '0' // V3 uses different reserve calculation
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Uniswap V3 reserves:', error);
    }
    return results;
  }

  async getPrice(tokenA: string, tokenB: string): Promise<PriceResult | null> {
    try {
      // Check if pool exists (using 0.3% fee tier)
      const poolAddress = await this.factory.getPool(tokenA, tokenB, 3000);
      if (poolAddress === COMMON.ZERO_ADDRESS) {
        return null;
      }

      // Get pool data
      const pool = new ethers.Contract(poolAddress, CONTRACT_ABIS.UNISWAP_V3.POOL, this.provider);
      const [sqrtPriceX96, , , , , ,] = await pool.slot0();
      const liquidity = await pool.liquidity();

      // Calculate price using quoter
      const amountIn = COMMON.parseEther('1'); // 1 token
      const data = this.quoter.interface.encodeFunctionData('quoteExactInputSingle', [
        tokenA,
        tokenB,
        3000,
        amountIn,
        0
      ]);
      const result = await this.provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data
      });
      const amountOut = ethers.getBigInt(result);
      const price = COMMON.formatEther(amountOut);

      return {
        dex: 'uniswap-v3',
        price,
        liquidity: COMMON.formatEther(liquidity),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Uniswap V3 price fetch failed:', error);
      return null;
    }
  }
} 