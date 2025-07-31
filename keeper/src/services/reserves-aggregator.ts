import { ethers } from 'ethers'
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex'
import { ReserveResult } from '../types/reserves'
import { TokenInfo } from '../types/token'
import { TokenService } from './token-service'
import { getCache, setCache, generateCacheKey } from '../utils/redis'

export type DexType =
  | 'uniswapV2'
  | 'uniswapV3_500'
  | 'uniswapV3_3000'
  | 'uniswapV3_10000'
  | 'sushiswap'

export class ReservesAggregator {
  private uniswapV2: UniswapV2Service
  private uniswapV3_500: UniswapV3Service
  private uniswapV3_3000: UniswapV3Service
  private uniswapV3_10000: UniswapV3Service
  private sushiswap: SushiSwapService
  private tokenService: TokenService
  private CACHE_TTL = 30 // 30 seconds cache

  constructor(provider: ethers.Provider) {
    this.uniswapV2 = new UniswapV2Service(provider)
    this.uniswapV3_500 = new UniswapV3Service(provider)
    this.uniswapV3_3000 = new UniswapV3Service(provider)
    this.uniswapV3_10000 = new UniswapV3Service(provider)
    this.sushiswap = new SushiSwapService(provider)
    this.tokenService = TokenService.getInstance(provider)
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
        console.error(
          `${name} fetch error (attempt ${retries + 1}/${maxRetries + 1}):`,
          error
        )

        if (retries === maxRetries) {
          console.error(`Failed to fetch ${name} after ${maxRetries} retries`)
          return null // Return null instead of throwing to handle gracefully
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

  private calculateGeometricMean(
    reserves: { token0: string; token1: string },
    decimals: { token0: number; token1: number }
  ): bigint {
    // Convert reserves to BigInt
    const reserve0 = BigInt(reserves.token0)
    const reserve1 = BigInt(reserves.token1)

    const normalizedReserve0 = this.normalizeTo18Decimals(
      reserve0,
      decimals.token0
    )
    const normalizedReserve1 = this.normalizeTo18Decimals(
      reserve1,
      decimals.token1
    )

    // Calculate geometric mean
    // sqrt(a * b) = sqrt(a) * sqrt(b)
    const sqrtReserve0 = this.sqrt(normalizedReserve0)
    const sqrtReserve1 = this.sqrt(normalizedReserve1)

    return sqrtReserve0 * sqrtReserve1
  }

  private sqrt(value: bigint): bigint {
    if (value < 0n)
      throw new Error('Cannot calculate square root of negative number')
    if (value < 2n) return value

    let x = value
    let y = (x + 1n) / 2n
    while (y < x) {
      x = y
      y = (x + value / x) / 2n
    }
    return x
  }

  private async checkUniV3(
    tokenA: string,
    tokenB: string,
    fee: number,
    decimals: { token0: number; token1: number }
  ): Promise<ReserveResult | null> {
    try {
      let service: UniswapV3Service
      switch (fee) {
        case 500:
          service = this.uniswapV3_500
          break
        case 3000:
          service = this.uniswapV3_3000
          break
        case 10000:
          service = this.uniswapV3_10000
          break
        default:
          throw new Error(`Invalid fee tier: ${fee}`)
      }

      const reserves = await this.fetchWithRetry(
        () => service.getReserves(tokenA, tokenB, fee),
        `Uniswap V3 (${fee})`
      )
      if (!reserves) return null

      return {
        ...reserves,
        decimals,
      }
    } catch {
      return null
    }
  }

  private async checkUniV2(
    tokenA: string,
    tokenB: string,
    decimals: { token0: number; token1: number }
  ): Promise<ReserveResult | null> {
    try {
      const reserves = await this.fetchWithRetry(
        () => this.uniswapV2.getReserves(tokenA, tokenB),
        'Uniswap V2'
      )
      if (!reserves) return null

      return {
        ...reserves,
        decimals,
      }
    } catch {
      return null
    }
  }

  private async checkSushiSwap(
    tokenA: string,
    tokenB: string,
    decimals: { token0: number; token1: number }
  ): Promise<ReserveResult | null> {
    try {
      const reserves = await this.fetchWithRetry(
        () => this.sushiswap.getReserves(tokenA, tokenB),
        'SushiSwap'
      )
      if (!reserves) return null

      return {
        ...reserves,
        decimals,
      }
    } catch {
      return null
    }
  }

  private findBestPool(results: ReserveResult[]): ReserveResult {
    return results.reduce((best, current) => {
      if (!best) return current

      const bestMean = this.calculateGeometricMean(best.reserves, best.decimals)
      const currentMean = this.calculateGeometricMean(
        current.reserves,
        current.decimals
      )

      return currentMean > bestMean ? current : best
    })
  }

  async getReservesFromDex(
    tokenA: string,
    tokenB: string,
    dex: DexType
  ): Promise<ReserveResult | null> {
    // Get token decimals
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB),
    ])

    const decimals = {
      token0: token0Info.decimals,
      token1: token1Info.decimals,
    }

    switch (dex) {
      case 'uniswapV2':
        return this.checkUniV2(tokenA, tokenB, decimals)
      case 'uniswapV3_500':
        return this.checkUniV3(tokenA, tokenB, 500, decimals)
      case 'uniswapV3_3000':
        return this.checkUniV3(tokenA, tokenB, 3000, decimals)
      case 'uniswapV3_10000':
        return this.checkUniV3(tokenA, tokenB, 10000, decimals)
      case 'sushiswap':
        return this.checkSushiSwap(tokenA, tokenB, decimals)
      default:
        throw new Error(`Unsupported DEX type: ${dex}`)
    }
  }

  async getAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    // Generate cache key
    const cacheKey = generateCacheKey('RESERVES', `${tokenA}-${tokenB}`)

    // Try cache first
    const cachedResult = await getCache<ReserveResult>(cacheKey)
    if (cachedResult) {
      console.log(`Cache hit for reserves of ${tokenA}-${tokenB}`)
      return cachedResult
    }

    return new Promise((resolve, reject) => {
      // Set a timeout to ensure we respond before Lambda times out
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout: Operation took too long'))
      }, 20000) // 20 seconds to allow for cache operations

      // Attempt to fetch reserves
      this._fetchAllReserves(tokenA, tokenB)
        .then(async (result) => {
          clearTimeout(timeout)
          // Cache successful results
          if (result) {
            await setCache(cacheKey, result, this.CACHE_TTL)
          }
          resolve(result)
        })
        .catch((error) => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  private async _fetchAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    // Get token decimals once
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB),
    ])

    const decimals = {
      token0: token0Info.decimals,
      token1: token1Info.decimals,
    }

    // Create promises for all DEX checks
    const dexPromises = [
      this.checkUniV3(tokenA, tokenB, 500, decimals),
      this.checkUniV3(tokenA, tokenB, 3000, decimals),
      this.checkUniV3(tokenA, tokenB, 10000, decimals),
      this.checkUniV2(tokenA, tokenB, decimals),
      this.checkSushiSwap(tokenA, tokenB, decimals),
    ]

    try {
      // Wait for all promises to complete with a timeout
      const results = await Promise.all(dexPromises)
      const validResults = results.filter((r): r is ReserveResult => r !== null)

      if (validResults.length === 0) {
        console.log('No valid reserves found from any DEX')
        return null
      }

      // Calculate mean reserves for each result
      const resultsWithMean = validResults.map((result) => ({
        result,
        meanReserves: this.calculateGeometricMean(
          result.reserves,
          result.decimals
        ),
      }))

      // Find the pool with highest liquidity
      const deepestPool = resultsWithMean.reduce((prev, current) => {
        return current.meanReserves > prev.meanReserves ? current : prev
      })

      console.log('Selected deepest pool with liquidity:', deepestPool.result)
      return deepestPool.result
    } catch (error) {
      console.error('Error fetching reserves:', error)
      return null
    }
  }
}
