import { ethers } from 'ethers';
import { PriceResult } from '../types/price';
import { ReserveResult } from '../types/reserves';
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, COMMON } from '../config/dex';
import { DepthData, DepthConfig, DepthPoint } from '../types/depth';
import { DecimalUtils } from '../utils/decimals';
import { TokenService } from '../services/token-service';

export class UniswapV3Service {
  private factory: ethers.Contract;
  private quoter: ethers.Contract;
  private provider: ethers.Provider;
  private tokenService: TokenService;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.tokenService = TokenService.getInstance(provider);
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

  async getReserves(tokenA: string, tokenB: string, feeTier: number): Promise<ReserveResult | null> {
    try {

      const poolAddress = await this.factory.getPool(tokenA, tokenB, feeTier);
      if (poolAddress === COMMON.ZERO_ADDRESS) {
        return null;
      }

      const pool = new ethers.Contract(poolAddress, CONTRACT_ABIS.UNISWAP_V3.POOL, this.provider);
      const liquidity = await pool.liquidity();

        return {
          dex: `uniswap-v3-${feeTier}`,
          pairAddress: poolAddress,
          reserves: {
              token0: liquidity.toString(), // Liquidity units always use 18 decimals
              token1: '0' // V3 uses liquidity units instead of direct reserves
            },
            timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Uniswap V3 reserves:', error);
      return null;
    }
  }

  async getPrice(tokenA: string, tokenB: string, feeTier: number): Promise<PriceResult | null> {
    try {
      const [token0Info, token1Info] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB)
      ]);

      // Check if pool exists (using 0.3% fee tier)
      const poolAddress = await this.factory.getPool(tokenA, tokenB, feeTier);
      if (poolAddress === COMMON.ZERO_ADDRESS) {
        return null;
      }

      // Calculate price using quoter
      const amountIn = DecimalUtils.normalizeAmount('1', token0Info.decimals);
      const data = this.quoter.interface.encodeFunctionData('quoteExactInputSingle', [
        tokenA,
        tokenB,
        feeTier,
        amountIn,
        0
      ]);
      const result = await this.provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data
      });
      const amountOut = ethers.getBigInt(result);
      const price = DecimalUtils.calculatePrice(
        amountIn,
        amountOut,
        token0Info.decimals,
        token1Info.decimals
      );

      return {
        dex: `uniswap-v3-${feeTier}`,
        price,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Uniswap V3 price fetch failed:', error);
      return null;
    }
  }

  // async getDepth(token0: string, token1: string, config: DepthConfig): Promise<DepthData[]> {
  //   const results: DepthData[] = [];
  //   try {
  //     const [token0Info, token1Info] = await Promise.all([
  //       this.tokenService.getTokenInfo(token0),
  //       this.tokenService.getTokenInfo(token1)
  //     ]);

  //     // Try different fee tiers
  //     const feeTiers = [500, 3000, 10000];
  //     for (const fee of feeTiers) {
  //       const poolAddress = await this.factory.getPool(token0, token1, fee);
  //       if (poolAddress !== COMMON.ZERO_ADDRESS) {
  //         const pool = new ethers.Contract(poolAddress, CONTRACT_ABIS.UNISWAP_V3.POOL, this.provider);
  //         const [slot0, liquidity] = await Promise.all([
  //           pool.slot0(),
  //           pool.liquidity()
  //         ]);

  //         // Get tick spacing from factory based on fee tier
  //         const tickSpacing = await this.factory.feeAmountTickSpacing(fee);

  //         const sqrtPriceX96 = slot0.sqrtPriceX96;
  //         const currentTick = slot0.tick;
  //         const currentPrice = (Number(sqrtPriceX96) / 2 ** 96) ** 2;
  //         const depthPoints: DepthPoint[] = [];

  //         for (const interval of config.priceIntervals) {
  //           const priceUp = currentPrice * (1 + interval);
  //           const priceDown = currentPrice * (1 - interval);

  //           // Calculate amounts at these price points using V3's tick-based liquidity
  //           const amountUp = this.calculateAmountAtPrice(
  //             liquidity,
  //             currentTick,
  //             tickSpacing,
  //             priceUp,
  //             token0Info.decimals,
  //             token1Info.decimals
  //           );
  //           const amountDown = this.calculateAmountAtPrice(
  //             liquidity,
  //             currentTick,
  //             tickSpacing,
  //             priceDown,
  //             token0Info.decimals,
  //             token1Info.decimals
  //           );

  //           depthPoints.push(
  //             { price: priceUp.toString(), amount: amountUp.toString() },
  //             { price: priceDown.toString(), amount: amountDown.toString() }
  //           );
  //         }

  //         results.push({
  //           token0,
  //           token1,
  //           dex: `uniswap-v3-${fee}`,
  //           timestamp: Math.floor(Date.now() / 1000),
  //           depthPoints: depthPoints.slice(0, config.maxDepthPoints)
  //         });
  //       }
  //     }
  //   } catch (error) {
  //     console.error('Error fetching Uniswap V3 depth:', error);
  //   }
  //   return results;
  // }

  // private calculateAmountAtPrice(
  //   liquidity: bigint,
  //   currentTick: number,
  //   tickSpacing: number,
  //   targetPrice: number,
  //   decimals0: number,
  //   decimals1: number
  // ): bigint {
  //   // Convert price to tick
  //   const targetTick = Math.floor(Math.log(targetPrice) / Math.log(1.0001));
    
  //   // Round to nearest tick spacing
  //   const roundedTick = Math.floor(targetTick / tickSpacing) * tickSpacing;
    
  //   // Calculate sqrt price for target tick
  //   const sqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1.0001 ** roundedTick) * 2 ** 96));
    
  //   // Calculate sqrt price for current tick
  //   const currentSqrtPriceX96 = BigInt(Math.floor(Math.sqrt(1.0001 ** currentTick) * 2 ** 96));
    
  //   // Calculate amount using V3's liquidity formula
  //   // Δx = L * (1/√P - 1/√P')
  //   const deltaX = liquidity * (
  //     (BigInt(2 ** 96) * BigInt(2 ** 96) / sqrtPriceX96) - 
  //     (BigInt(2 ** 96) * BigInt(2 ** 96) / currentSqrtPriceX96)
  //   ) / BigInt(2 ** 96);
    
  //   // Adjust for token decimals
  //   const adjustedDeltaX = deltaX * BigInt(10 ** decimals0) / BigInt(10 ** 18);
    
  //   return adjustedDeltaX;
  // }
} 