import { ethers } from 'ethers'
import { UniswapV2Service, UniswapV3Service, SushiSwapService } from '../dex'
import { ReserveResult } from '../types/reserves'

export class ReservesAggregator {
  private uniswapV2: UniswapV2Service
  private uniswapV3_500: UniswapV3Service
  private uniswapV3_3000: UniswapV3Service
  private uniswapV3_10000: UniswapV3Service
  private sushiswap: SushiSwapService

  constructor(provider: ethers.Provider) {
    this.uniswapV2 = new UniswapV2Service(provider)
    this.uniswapV3_500 = new UniswapV3Service(provider)
    this.uniswapV3_3000 = new UniswapV3Service(provider)
    this.uniswapV3_10000 = new UniswapV3Service(provider)
    this.sushiswap = new SushiSwapService(provider)
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

  async getAllReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult[]> {
    const results: ReserveResult[] = []

    // Fetch data sequentially instead of in parallel to avoid rate limits
    console.log('Fetching Uniswap V3 (500) reserves...')
    const uniswapV3_500Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_500.getReserves(tokenA, tokenB, 500),
      'Uniswap V3 (500)'
    )
    if (uniswapV3_500Reserves) results.push(uniswapV3_500Reserves)

    console.log('Fetching Uniswap V3 (3000) reserves...')
    const uniswapV3_3000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_3000.getReserves(tokenA, tokenB, 3000),
      'Uniswap V3 (3000)'
    )
    if (uniswapV3_3000Reserves) results.push(uniswapV3_3000Reserves)

    console.log('Fetching Uniswap V3 (10000) reserves...')
    const uniswapV3_10000Reserves = await this.fetchWithRetry(
      () => this.uniswapV3_10000.getReserves(tokenA, tokenB, 10000),
      'Uniswap V3 (10000)'
    )
    if (uniswapV3_10000Reserves) results.push(uniswapV3_10000Reserves)

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('Fetching Uniswap V2 reserves...')
    const uniswapV2Reserves = await this.fetchWithRetry(
      () => this.uniswapV2.getReserves(tokenA, tokenB),
      'Uniswap V2'
    )
    if (uniswapV2Reserves) results.push(uniswapV2Reserves)

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500))

    console.log('Fetching SushiSwap reserves...')
    const sushiswapReserves = await this.fetchWithRetry(
      () => this.sushiswap.getReserves(tokenA, tokenB),
      'SushiSwap'
    )
    if (sushiswapReserves) results.push(sushiswapReserves)

    return results
  }
}
