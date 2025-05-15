import { ethers } from 'ethers'
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex'
import { ReserveResult } from '../types/reserves'
import { TokenInfo } from '../types/token'
import { TokenService } from './token-service'

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
        return await fetchFn()
      } catch (error) {
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

  private calculateV2Liquidity(reserves: { token0: string, token1: string }, token0Decimals: number, token1Decimals: number): bigint {
    // Convert reserves to BigInt
    const reserve0 = BigInt(reserves.token0)
    const reserve1 = BigInt(reserves.token1)

    // Normalize reserves to 18 decimals for fair comparison
    const normalizedReserve0 = this.normalizeTo18Decimals(reserve0, token0Decimals)
    const normalizedReserve1 = this.normalizeTo18Decimals(reserve1, token1Decimals)

    // Calculate geometric mean
    // sqrt(a * b) = sqrt(a) * sqrt(b)
    const sqrtReserve0 = this.sqrt(normalizedReserve0)
    const sqrtReserve1 = this.sqrt(normalizedReserve1)
    
    return sqrtReserve0 * sqrtReserve1
  }

  private normalizeTo18Decimals(value: bigint, fromDecimals: number): bigint {
    if (fromDecimals === 18) return value
    if (fromDecimals > 18) {
      return value / BigInt(10n ** BigInt(fromDecimals - 18))
    }
    return value * BigInt(10n ** BigInt(18 - fromDecimals))
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

  async getAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    // Get token decimals
    const [token0Info, token1Info] = await Promise.all([
      this.tokenService.getTokenInfo(tokenA),
      this.tokenService.getTokenInfo(tokenB)
    ])

    const results: { result: ReserveResult, liquidity: bigint }[] = []

    // Fetch data sequentially instead of in parallel to avoid rate limits
    console.log('Fetching Uniswap V3 (500) reserves...')
    const uniswapV3_500Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
      'Uniswap V3 (500)'
    )
    if (uniswapV3_500Reserves) {
      const liquidity = BigInt(uniswapV3_500Reserves.reserves.token0)
      console.log('Uniswap V3 (500) liquidity:', liquidity.toString())
      results.push({
        result: uniswapV3_500Reserves,
        liquidity
      })
    }

    console.log('Fetching Uniswap V3 (3000) reserves...')
    const uniswapV3_3000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
      'Uniswap V3 (3000)'
    )
    if (uniswapV3_3000Reserves) {
      const liquidity = BigInt(uniswapV3_3000Reserves.reserves.token0)
      console.log('Uniswap V3 (3000) liquidity:', liquidity.toString())
      results.push({
        result: uniswapV3_3000Reserves,
        liquidity
      })
    }

    console.log('Fetching Uniswap V3 (10000) reserves...')
    const uniswapV3_10000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
      'Uniswap V3 (10000)'
    )
    if (uniswapV3_10000Reserves) {
      const liquidity = BigInt(uniswapV3_10000Reserves.reserves.token0)
      console.log('Uniswap V3 (10000) liquidity:', liquidity.toString())
      results.push({
        result: uniswapV3_10000Reserves,
        liquidity
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
      const liquidity = this.calculateV2Liquidity(
        uniswapV2Reserves.reserves,
        token0Info.decimals,
        token1Info.decimals
      )
      console.log('Uniswap V2 liquidity:', liquidity.toString())
      console.log('Uniswap V2 raw reserves:', {
        token0: uniswapV2Reserves.reserves.token0,
        token1: uniswapV2Reserves.reserves.token1
      })
      results.push({
        result: uniswapV2Reserves,
        liquidity
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
      const liquidity = this.calculateV2Liquidity(
        sushiswapReserves.reserves,
        token0Info.decimals,
        token1Info.decimals
      )
      console.log('SushiSwap liquidity:', liquidity.toString())
      console.log('SushiSwap raw reserves:', {
        token0: sushiswapReserves.reserves.token0,
        token1: sushiswapReserves.reserves.token1
      })
      results.push({
        result: sushiswapReserves,
        liquidity
      })
    }

    if (results.length === 0) {
      return null
    }

    // Find the result with highest liquidity
    const deepestPool = results.reduce((prev, current) => {
      console.log('Comparing pools:')
      console.log('Previous pool liquidity:', prev.liquidity.toString())
      console.log('Current pool liquidity:', current.liquidity.toString())
      return current.liquidity > prev.liquidity ? current : prev
    })

    console.log('Selected deepest pool with liquidity:', deepestPool.liquidity.toString())

    return deepestPool.result
  }
}
