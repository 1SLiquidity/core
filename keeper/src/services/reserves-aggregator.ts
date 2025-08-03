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
    maxRetries = 1, // Reduced from 2 to 1
    delay = 2000 // Increased from 1000 to 2000
  ): Promise<ReserveResult | null> {
    let retries = 0
    const startTime = Date.now()

    while (retries <= maxRetries) {
      try {
        const attemptStartTime = Date.now()
        console.log(
          `${name} - Attempt ${retries + 1}/${maxRetries + 1} starting...`
        )

        // Longer timeout since we're making fewer calls
        const result = await Promise.race([
          fetchFn(),
          new Promise<ReserveResult | null>((_, reject) =>
            setTimeout(
              () => reject(new Error(`${name} call timeout after 20s`)),
              20000
            )
          ),
        ])

        const attemptEndTime = Date.now()
        console.log(
          `${name} - Attempt ${retries + 1} completed in ${
            attemptEndTime - attemptStartTime
          }ms`
        )

        if (result === null) {
          console.log(`${name} returned null (no pool found)`)
        } else {
          console.log(
            `${name} successful after ${retries + 1} attempts, total time: ${
              attemptEndTime - startTime
            }ms`
          )
        }
        return result
      } catch (error) {
        const attemptEndTime = Date.now()
        console.error(
          `${name} fetch error (attempt ${retries + 1}/${
            maxRetries + 1
          }) after ${attemptEndTime - startTime}ms:`,
          error instanceof Error ? error.message : error
        )

        if (retries === maxRetries) {
          const totalTime = Date.now() - startTime
          console.error(
            `Failed to fetch ${name} after ${
              maxRetries + 1
            } attempts, total time: ${totalTime}ms`
          )
          return null // Return null instead of throwing to continue with other DEXes
        }

        console.log(
          `Retrying ${name} fetch (${
            retries + 1
          }/${maxRetries}) after ${delay}ms delay...`
        )
        retries++
        // Shorter delay between retries
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
      }, 80000) // 80 seconds to allow Lambda to respond cleanly (API Gateway limit is 89s)

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
    const startTime = Date.now()
    console.log(
      `Starting reserves fetch for ${tokenA}-${tokenB} at ${new Date().toISOString()}`
    )

    // Get token decimals
    const tokenStartTime = Date.now()
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB),
    ])
    const tokenEndTime = Date.now()
    console.log(`Token info fetch took ${tokenEndTime - tokenStartTime}ms`)

    const results: { result: ReserveResult; meanReserves: bigint }[] = []

    // Fetch from all DEXes to find best liquidity, but with longer delays
    console.log('Fetching Uniswap V3 (500) reserves...')
    const uniV3_500StartTime = Date.now()
    const uniswapV3_500Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
      'Uniswap V3 (500)'
    )
    const uniV3_500EndTime = Date.now()
    console.log(
      `Uniswap V3 (500) fetch took ${uniV3_500EndTime - uniV3_500StartTime}ms`
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

    // Longer delay between DEX calls
    console.log('Adding 2s delay before Uniswap V3 (3000)...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log('Fetching Uniswap V3 (3000) reserves...')
    const uniV3_3000StartTime = Date.now()
    const uniswapV3_3000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
      'Uniswap V3 (3000)'
    )
    const uniV3_3000EndTime = Date.now()
    console.log(
      `Uniswap V3 (3000) fetch took ${
        uniV3_3000EndTime - uniV3_3000StartTime
      }ms`
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

    console.log('Adding 2s delay before Uniswap V3 (10000)...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log('Fetching Uniswap V3 (10000) reserves...')
    const uniV3_10000StartTime = Date.now()
    const uniswapV3_10000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
      'Uniswap V3 (10000)'
    )
    const uniV3_10000EndTime = Date.now()
    console.log(
      `Uniswap V3 (10000) fetch took ${
        uniV3_10000EndTime - uniV3_10000StartTime
      }ms`
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

    console.log('Adding 2s delay before Uniswap V2...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log('Fetching Uniswap V2 reserves...')
    const uniV2StartTime = Date.now()
    const uniswapV2Reserves = await this.fetchWithRetry(
      () => this.uniswapV2.getReserves(tokenA, tokenB),
      'Uniswap V2'
    )
    const uniV2EndTime = Date.now()
    console.log(`Uniswap V2 fetch took ${uniV2EndTime - uniV2StartTime}ms`)

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

    console.log('Adding 2s delay before SushiSwap...')
    await new Promise((resolve) => setTimeout(resolve, 2000))

    console.log('Fetching SushiSwap reserves...')
    const sushiStartTime = Date.now()
    const sushiswapReserves = await this.fetchWithRetry(
      () => this.sushiswap.getReserves(tokenA, tokenB),
      'SushiSwap'
    )
    const sushiEndTime = Date.now()
    console.log(`SushiSwap fetch took ${sushiEndTime - sushiStartTime}ms`)

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

    const totalTime = Date.now() - startTime
    console.log(`Total fetch operation took ${totalTime}ms`)

    if (results.length === 0) {
      console.log('No valid reserves found from any DEX')
      return null
    }

    // Find the result with highest liquidity
    const deepestPool = results.reduce((prev, current) => {
      return current.meanReserves > prev.meanReserves ? current : prev
    })

    console.log('Selected deepest pool with liquidity:', deepestPool.result)
    console.log(
      `Complete reserves fetch for ${tokenA}-${tokenB} took ${totalTime}ms`
    )

    return {
      ...deepestPool.result,
      decimals: {
        token0: token0Info.decimals,
        token1: token1Info.decimals,
      },
    }
  }
}
