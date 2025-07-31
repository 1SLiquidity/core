import { ethers } from 'ethers'
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex'
import { ReserveResult } from '../types/reserves'
import { TokenInfo } from '../types/token'
import { TokenService } from './token-service'

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
          throw error // Let the caller handle the error
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
      default:
        throw new Error(`Unsupported DEX type: ${dex}`)
    }

    if (reserves) {
      // Add decimals information to the result
      return {
        ...reserves,
        decimals: {
          token0: token0Info.decimals,
          token1: token1Info.decimals,
        },
      }
    }

    return null
  }

  async getAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    return new Promise((resolve, reject) => {
      // Set a timeout to ensure we respond before Lambda times out
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout: Operation took too long'))
      }, 25000) // 25 seconds to allow Lambda to respond

      // Attempt to fetch reserves
      this._fetchAllReserves(tokenA, tokenB)
        .then((result) => {
          clearTimeout(timeout)
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
    // Get token decimals
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB),
    ])

    const results: { result: ReserveResult; meanReserves: bigint }[] = []

    // Fetch data sequentially instead of in parallel to avoid rate limits
    console.log('Fetching Uniswap V3 (500) reserves...')
    const uniswapV3_500Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
      'Uniswap V3 (500)'
    )
    if (uniswapV3_500Reserves) {
      const meanReserves = this.calculateGeometricMean(
        uniswapV3_500Reserves.reserves,
        { token0: token0Info.decimals, token1: token1Info.decimals }
      )
      results.push({
        result: uniswapV3_500Reserves,
        meanReserves,
      })
    }

    console.log('Fetching Uniswap V3 (3000) reserves...')
    const uniswapV3_3000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
      'Uniswap V3 (3000)'
    )
    if (uniswapV3_3000Reserves) {
      const meanReserves = this.calculateGeometricMean(
        uniswapV3_3000Reserves.reserves,
        { token0: token0Info.decimals, token1: token1Info.decimals }
      )
      results.push({
        result: uniswapV3_3000Reserves,
        meanReserves,
      })
    }

    console.log('Fetching Uniswap V3 (10000) reserves...')
    const uniswapV3_10000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
      'Uniswap V3 (10000)'
    )
    if (uniswapV3_10000Reserves) {
      const meanReserves = this.calculateGeometricMean(
        uniswapV3_10000Reserves.reserves,
        { token0: token0Info.decimals, token1: token1Info.decimals }
      )
      results.push({
        result: uniswapV3_10000Reserves,
        meanReserves,
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
      const meanReserves = this.calculateGeometricMean(
        uniswapV2Reserves.reserves,
        { token0: token0Info.decimals, token1: token1Info.decimals }
      )
      results.push({
        result: uniswapV2Reserves,
        meanReserves,
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
      const meanReserves = this.calculateGeometricMean(
        sushiswapReserves.reserves,
        { token0: token0Info.decimals, token1: token1Info.decimals }
      )
      console.log('SushiSwap meanReserves:', meanReserves.toString())
      results.push({
        result: sushiswapReserves,
        meanReserves,
      })
    }

    if (results.length === 0) {
      return null
    }

    // Find the result with highest liquidity
    const deepestPool = results.reduce((prev, current) => {
      return current.meanReserves > prev.meanReserves ? current : prev
    })

    console.log('Selected deepest pool with liquidity:', deepestPool.result)

    return {
      ...deepestPool.result,
      decimals: {
        token0: token0Info.decimals,
        token1: token1Info.decimals,
      },
    }
  }
}
