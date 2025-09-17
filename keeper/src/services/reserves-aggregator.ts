import { ethers } from 'ethers'
import { UniswapV2Service, UniswapV3Service, SushiSwapService, CurveService, BalancerService } from '../dex'
import { ReserveResult } from '../types/reserves'
import { TokenInfo } from '../types/token'
import { TokenService } from './token-service'
import { CONTRACT_ADDRESSES } from '../config/dex'
import { CurvePoolFilter, createCurvePoolFilter } from './curve-pool-filter'
import { BalancerPoolFilter, createBalancerPoolFilter } from './balancer-pool-filter'

export type DexType = 'uniswapV2' | 'uniswapV3_500' | 'uniswapV3_3000' | 'uniswapV3_10000' | 'sushiswap' | 'curve' | 'balancer'

export class ReservesAggregator {
  private uniswapV2: UniswapV2Service
  private uniswapV3_500: UniswapV3Service
  private uniswapV3_3000: UniswapV3Service
  private uniswapV3_10000: UniswapV3Service
  private sushiswap: SushiSwapService
  private curveServices: Map<string, CurveService>
  private curvePoolFilter: CurvePoolFilter | null = null
  private balancerServices: Map<string, BalancerService>
  private balancerPoolFilter: BalancerPoolFilter | null = null
  private tokenService: TokenService
  private provider: ethers.Provider

  constructor(provider: ethers.Provider) {
    this.provider = provider
    this.uniswapV2 = new UniswapV2Service(provider)
    this.uniswapV3_500 = new UniswapV3Service(provider)
    this.uniswapV3_3000 = new UniswapV3Service(provider)
    this.uniswapV3_10000 = new UniswapV3Service(provider)
    this.sushiswap = new SushiSwapService(provider)
    this.curveServices = new Map()
    this.balancerServices = new Map()
    this.tokenService = TokenService.getInstance(provider)
    
    // Balancer and Curve services will be initialized dynamically when pool filters are set up
  }

  /**
   * Initialize Curve pool filter with metadata
   * Call this after loading CURVE_POOL_METADATA
   */
  initializeCurvePoolFilter(poolMetadata: Record<string, any>) {
    this.curvePoolFilter = createCurvePoolFilter(poolMetadata)
    
    // Initialize Curve services for all pools in metadata
    Object.keys(poolMetadata).forEach(poolAddress => {
      this.curveServices.set(poolAddress, new CurveService(this.provider, poolAddress))
    })
    
    console.log(`Initialized ${Object.keys(poolMetadata).length} Curve services`)
  }

  /**
   * Initialize Balancer pool filter with metadata
   * Call this after loading BALANCER_POOL_METADATA
   */
  initializeBalancerPoolFilter(poolMetadata: Record<string, any>) {
    this.balancerPoolFilter = createBalancerPoolFilter(poolMetadata)
    
    // Initialize Balancer services for all pools in metadata
    Object.keys(poolMetadata).forEach(poolAddress => {
      this.balancerServices.set(poolAddress, new BalancerService(this.provider, poolAddress))
    })
    
    console.log(`Initialized ${Object.keys(poolMetadata).length} Balancer services`)
  }

  // Helper method for fetching with retries
  private async fetchWithRetry(
    fetchFn: () => Promise<ReserveResult | null>,
    name: string,
    maxRetries = 2,
    delay = 1000
  ): Promise<ReserveResult | null> {
    let retries = 0
    while (retries <= maxRetries) {
      try {
        const result = await fetchFn()
        if (result === null) {
          console.log(`${name} returned null (no pool found)`)
        }
        return result
      } catch (error) {
        console.error(`${name} fetch error (attempt ${retries + 1}/${maxRetries + 1}):`, error)
        if (retries === maxRetries) {
          console.error(`Failed to fetch ${name} after ${maxRetries} retries`)
          return null
        }
        console.log(`Retrying ${name} fetch (${retries + 1}/${maxRetries})...`)
        retries++
        // Simple delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
    return null
  }

  private normalizeTo18Decimals(value: bigint, fromDecimals: number): bigint {
    if (fromDecimals === 18) return value
    if (fromDecimals > 18) {
      return value / BigInt(10n ** BigInt(fromDecimals - 18))
    }
    return value * BigInt(10n ** BigInt(18 - fromDecimals))
  }

  private calculateGeometricMean(reserves: { token0: string, token1: string }, decimals: { token0: number, token1: number }): bigint {
    // Convert reserves to BigInt
    const reserve0 = BigInt(reserves.token0)
    const reserve1 = BigInt(reserves.token1)

    const normalizedReserve0 = this.normalizeTo18Decimals(reserve0, decimals.token0)
    const normalizedReserve1 = this.normalizeTo18Decimals(reserve1, decimals.token1)

    // Calculate geometric mean
    // sqrt(a * b) = sqrt(a) * sqrt(b)
    const sqrtReserve0 = this.sqrt(normalizedReserve0)
    const sqrtReserve1 = this.sqrt(normalizedReserve1)
    
    return sqrtReserve0 * sqrtReserve1
  }

  private sqrt(value: bigint): bigint {
    if (value < 0n) throw new Error('Cannot calculate square root of negative number')
    if (value < 2n) return value

    let x = value
    let y = (x + 1n) / 2n
    while (y < x) {
      x = y
      y = (x + value / x) / 2n
    }
    return x
  }

  async getReservesFromDex(tokenA: string, tokenB: string, dex: DexType): Promise<ReserveResult | null> {
    // Get token decimals
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB)
    ])

    let reserves: ReserveResult | null = null

    switch (dex) {
      case 'uniswapV2':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV2.getReserves(tokenA, tokenB),
          'Uniswap V2'
        )
        break
      case 'uniswapV3_500':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
          'Uniswap V3 (500)'
        )
        break
      case 'uniswapV3_3000':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
          'Uniswap V3 (3000)'
        )
        break
      case 'uniswapV3_10000':
        reserves = await this.fetchWithRetry(
          () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
          'Uniswap V3 (10000)'
        )
        break
      case 'sushiswap':
        reserves = await this.fetchWithRetry(
          () => this.sushiswap.getReserves(tokenA, tokenB),
          'SushiSwap'
        )
        break
      case 'curve':
        if (this.curvePoolFilter) {
          // Use smart filtering to find the best Curve pool
          const candidatePools = this.curvePoolFilter.findBestPools(tokenA, tokenB, 1)
          if (candidatePools.length === 0) {
            console.log(`No suitable Curve pools found for ${tokenA}/${tokenB}`)
            return null
          }
          
          const bestPoolAddress = candidatePools[0]
          const curveService = this.curveServices.get(bestPoolAddress)
          if (!curveService) {
            console.log(`Curve service not found for pool ${bestPoolAddress}`)
            return null
          }
          
          reserves = await this.fetchWithRetry(
            () => curveService.getReserves(tokenA, tokenB),
            `Curve ${bestPoolAddress}`
          )
          
          if (reserves) {
            reserves.dex = `curve-${bestPoolAddress}`
          }
        } else {
          console.log('Curve pool filter not initialized - skipping Curve pools')
          return null
        }
        break
      case 'balancer':
        if (this.balancerPoolFilter) {
          // Use smart filtering to find the best Balancer pool
          const candidatePools = await this.balancerPoolFilter.findBestPools(tokenA, tokenB, 1)
          if (candidatePools.length === 0) {
            console.log(`No suitable Balancer pools found for ${tokenA}/${tokenB}`)
            return null
          }
          
          const bestPoolAddress = candidatePools[0]
          const balancerService = this.balancerServices.get(bestPoolAddress)
          if (!balancerService) {
            console.log(`Balancer service not found for pool ${bestPoolAddress}`)
            return null
          }
          
          const balancerResult = await balancerService.getReserves(tokenA, tokenB)
          if (balancerResult) {
            reserves = {
              dex: balancerResult.dex,
              pairAddress: balancerResult.pairAddress,
              reserves: balancerResult.reserves,
              decimals: {
                token0: token0Info.decimals,
                token1: token1Info.decimals
              },
              timestamp: balancerResult.timestamp
            }
          }
        } else {
          console.log('Balancer pool filter not initialized - skipping Balancer pools')
          return null
        }
        break
      default:
        throw new Error(`Unsupported DEX type: ${dex}`)
    }

    if (reserves) {
      // Add decimals information to the result
      return {
        ...reserves,
        decimals: {
          token0: token0Info.decimals,
          token1: token1Info.decimals
        }
      }
    }

    return null
  }

  async getAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    // Get token decimals
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB)
    ])

    const results: { result: ReserveResult, meanReserves: bigint }[] = []

    // Fetch data sequentially instead of in parallel to avoid rate limits
    console.log('Fetching Uniswap V3 (500) reserves...')
    const uniswapV3_500Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
      'Uniswap V3 (500)'
    )
    if (uniswapV3_500Reserves) {
      console.log('Uniswap V3 (500) reserves:', uniswapV3_500Reserves.reserves)
      const meanReserves = this.calculateGeometricMean(uniswapV3_500Reserves.reserves, { token0: token0Info.decimals, token1: token1Info.decimals })
      // console.log('Uniswap V3 (500) meanReserves:', meanReserves.toString())
      results.push({
        result: uniswapV3_500Reserves,
        meanReserves: meanReserves
      })
    }

    console.log('Fetching Uniswap V3 (3000) reserves...')
    const uniswapV3_3000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
      'Uniswap V3 (3000)' 
    )
    if (uniswapV3_3000Reserves) {
      console.log('Uniswap V3 (3000) reserves:', uniswapV3_3000Reserves.reserves)
      const meanReserves = this.calculateGeometricMean(uniswapV3_3000Reserves.reserves, { token0: token0Info.decimals, token1: token1Info.decimals })
      // console.log('Uniswap V3 (3000) meanReserves:', meanReserves.toString())
      results.push({
        result: uniswapV3_3000Reserves,
        meanReserves: meanReserves
      })
    }

    console.log('Fetching Uniswap V3 (10000) reserves...')
    const uniswapV3_10000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
      'Uniswap V3 (10000)'
    )
    if (uniswapV3_10000Reserves) {
      console.log('Uniswap V3 (10000) reserves:', uniswapV3_10000Reserves.reserves)
      const meanReserves = this.calculateGeometricMean(uniswapV3_10000Reserves.reserves, { token0: token0Info.decimals, token1: token1Info.decimals })
      // console.log('Uniswap V3 (10000) meanReserves:', meanReserves.toString())
      results.push({
        result: uniswapV3_10000Reserves,
        meanReserves: meanReserves
      })
    }

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('Fetching Uniswap V2 reserves...')
    const uniswapV2Reserves = await this.fetchWithRetry(
      () => this.uniswapV2.getReserves(tokenA, tokenB),
      'Uniswap V2'
    )
    if (uniswapV2Reserves) {
      console.log('Uniswap V2 reserves:', uniswapV2Reserves.reserves)
      const meanReserves = this.calculateGeometricMean(uniswapV2Reserves.reserves, { token0: token0Info.decimals, token1: token1Info.decimals })
      // console.log('Uniswap V2 meanReserves:', meanReserves.toString())
      results.push({
        result: uniswapV2Reserves,
        meanReserves: meanReserves
      })
    }

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('Fetching SushiSwap reserves...')
    const sushiswapReserves = await this.fetchWithRetry(
      () => this.sushiswap.getReserves(tokenA, tokenB),
      'SushiSwap'
    )
    if (sushiswapReserves) {
      const meanReserves = this.calculateGeometricMean(sushiswapReserves.reserves, { token0: token0Info.decimals, token1: token1Info.decimals })
      // console.log('SushiSwap meanReserves:', meanReserves.toString())
      results.push({
        result: sushiswapReserves,
        meanReserves: meanReserves
      })
    }

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Try Curve pools for the token pair with smart filtering
    console.log('Fetching Curve reserves...')
    if (this.curvePoolFilter) {
      // Use smart filtering to find relevant pools
      const candidatePools = this.curvePoolFilter.findBestPools(tokenA, tokenB, 5)
      console.log(`Found ${candidatePools.length} candidate Curve pools for ${tokenA}/${tokenB}`)
      
      for (const poolAddress of candidatePools) {
        const curveService = this.curveServices.get(poolAddress)
        if (!curveService) continue
        
        try {
          const curveReserves = await this.fetchWithRetry(
            () => curveService.getReserves(tokenA, tokenB),
            `Curve ${poolAddress}`
          )
          if (curveReserves) {
            const meanReserves = this.calculateGeometricMean(curveReserves.reserves, { token0: token0Info.decimals, token1: token1Info.decimals })
            // console.log(`Curve ${poolAddress} meanReserves:`, meanReserves.toString())
            // Update the dex name to include pool address
            curveReserves.dex = `curve-${poolAddress}`
            results.push({
              result: curveReserves,
              meanReserves: meanReserves
            })
          }
        } catch (error) {
          console.log(`Curve ${poolAddress} reserves fetch failed:`, error)
        }
      }
    } else {
      console.log('Curve pool filter not initialized - skipping Curve pools')
    }

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Try Balancer pools for the token pair with smart filtering
    console.log('Fetching Balancer reserves...');
    if (this.balancerPoolFilter) {
      // Use smart filtering to find relevant pools
      const candidatePools = await this.balancerPoolFilter.findBestPools(tokenA, tokenB, 5);
      console.log(`Found ${candidatePools.length} candidate Balancer pools for ${tokenA}/${tokenB}`);
      
      for (const poolAddress of candidatePools) {
        const balancerService = this.balancerServices.get(poolAddress);
        if (!balancerService) continue;
        
        try {
          const balancerResult = await balancerService.getReserves(tokenA, tokenB);
          if (balancerResult) {
            const balancerReserves = {
              dex: balancerResult.dex,
              pairAddress: balancerResult.pairAddress,
              reserves: balancerResult.reserves,
              decimals: {
                token0: token0Info.decimals,
                token1: token1Info.decimals
              },
              timestamp: balancerResult.timestamp
            };
            const meanReserves = this.calculateGeometricMean(balancerReserves.reserves, { token0: token0Info.decimals, token1: token1Info.decimals });
            // console.log(`Balancer ${poolAddress} meanReserves:`, meanReserves.toString());
            results.push({
              result: balancerReserves,
              meanReserves: meanReserves
            });
          }
        } catch (error) {
          console.log(`Balancer ${poolAddress} reserves fetch failed:`, error);
        }
      }
    } else {
      console.log('Balancer pool filter not initialized - skipping Balancer pools');
    }

    if (results.length === 0) {
      return null
    }

    // Find the result with highest liquidity
    const deepestPool = results.reduce((prev, current) => {
      return current.meanReserves > prev.meanReserves ? current : prev
    })

    console.log('Selected deepest pool with liquidity:', deepestPool.result)

    // Add decimals information to the result
    return {
      ...deepestPool.result,
      decimals: {
        token0: token0Info.decimals,
        token1: token1Info.decimals
      }
    }
  }
}
