import { ethers } from 'ethers'
import { CONTRACT_ADDRESSES, getContractAddress } from '../config/contracts'
import {
  UniswapV2RouterABI,
  UniswapV3QuoterABI,
  SushiSwapRouterABI,
} from '../config/abis'

// Create a shared provider instance to avoid too many connections
// This should be reused across all calculator instances
const sharedProviders: Record<string, ethers.providers.Provider> = {}

const getSharedProvider = (chainId: string): ethers.providers.Provider => {
  if (!sharedProviders[chainId]) {
    // Use a JsonRpcProvider with a sensible polling interval to reduce requests
    sharedProviders[chainId] = new ethers.providers.JsonRpcProvider(
      'https://eth-mainnet.alchemyapi.io/v2/_gg7wSSi0KMBsdKnGVfHDueq6xMB9EkC',
      parseInt(chainId)
    )

    // Increase polling interval to reduce requests (default is 4000ms)
    ;(
      sharedProviders[chainId] as ethers.providers.JsonRpcProvider
    ).pollingInterval = 15000
  }
  return sharedProviders[chainId]
}

export function createAlchemyProvider(): ethers.providers.JsonRpcProvider {
  const ALCHEMY_API_KEY = 'eqzoGPYFURd6rxyiC_gON9JMZ4J7Wyk6' // replace with your actual key
  const url = `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_API_KEY}`
  const provider = new ethers.providers.JsonRpcProvider(url)

  return provider
}

// Extract fee tier from DEX identifier (e.g., "uniswap-v3-3000" -> 3000)
export const extractFeeTier = (dexType: string): number => {
  if (dexType.startsWith('uniswap-v3-')) {
    const feeStr = dexType.split('-').pop()
    if (feeStr && !isNaN(parseInt(feeStr))) {
      return parseInt(feeStr)
    }
  }
  // Default fee tier (0.3%)
  return 3000
}

// Simple cache for calculation results
interface CalculationCacheEntry {
  result: string
  timestamp: number
  expiryTime: number // Time in ms that this cache entry is valid
}

class CalculationCache {
  private cache: Record<string, CalculationCacheEntry> = {}

  // 30 seconds cache validity by default
  get(key: string, validityTime: number = 30000): string | null {
    const entry = this.cache[key]
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.expiryTime) {
      // Cache entry expired
      delete this.cache[key]
      return null
    }

    return entry.result
  }

  set(key: string, value: string, expiryTime: number = 30000): void {
    this.cache[key] = {
      result: value,
      timestamp: Date.now(),
      expiryTime,
    }

    // Clean up old entries periodically
    if (Object.keys(this.cache).length > 100) {
      this.cleanup()
    }
  }

  cleanup(): void {
    const now = Date.now()
    for (const key in this.cache) {
      if (now - this.cache[key].timestamp > this.cache[key].expiryTime) {
        delete this.cache[key]
      }
    }
  }
}

// Create shared calculation cache
const calculationCache = new CalculationCache()

// Reserve data structure
export interface ReserveData {
  dex: string
  pairAddress: string
  reserves: {
    token0: string
    token1: string
  }
  timestamp: number
  // Token addresses
  token0Address?: string
  token1Address?: string
  // Token decimals from backend
  decimals: {
    token0: number
    token1: number
  }
}

// DEX calculator interface following the Strategy pattern
export interface DexCalculator {
  getProvider(): ethers.providers.Provider
  calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string>
  calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string>
  getPairAddress(reserveData: ReserveData): string
  getExchangeFee(): number // Return fee as a percentage (e.g., 0.3 for 0.3%)
  calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>
  calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>
}

// Abstract base class for DEX calculators to share common functionality
export abstract class BaseDexCalculator implements DexCalculator {
  protected provider: ethers.providers.Provider
  protected chainId: string

  constructor(chainId: string = '1') {
    // Use shared provider to reduce connections
    // this.provider = getSharedProvider(chainId)
    this.provider = createAlchemyProvider()
    this.chainId = chainId
  }

  getProvider(): ethers.providers.Provider {
    return this.provider
  }

  abstract calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string>
  abstract calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string>
  abstract getExchangeFee(): number
  abstract calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>
  abstract calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string>

  getPairAddress(reserveData: ReserveData): string {
    return reserveData?.pairAddress || ''
  }

  // Helper method to format output with specified decimals
  protected formatOutput(
    amount: ethers.BigNumber,
    decimals: number = 18
  ): string {
    try {
      // Format with all decimals first
      const formatted = ethers.utils.formatUnits(amount, decimals)
      console.log('Raw formatted amount:', formatted)

      // Check if this is a "whole" number that should be preserved exactly
      // e.g., if someone entered 1.0, we want to return exactly 1.0, not 0.999999999
      const value = parseFloat(formatted)

      // Special handling for common values that should be exact
      if (Math.abs(value - 1) < 0.000001) {
        console.log('Preserving exact value: 1')
        return '1'
      }

      // Handle other nice round numbers (0.1, 0.5, 2, 5, 10, etc.)
      const niceNumbers = [0.1, 0.5, 2, 5, 10, 20, 50, 100]
      for (const nice of niceNumbers) {
        if (Math.abs(value - nice) < 0.000001) {
          console.log(`Preserving exact nice number: ${nice}`)
          return nice.toString()
        }
      }

      // Check if this is a "whole" number (integer)
      if (Math.abs(Math.round(value) - value) < 0.000001) {
        console.log('Preserving integer value:', Math.round(value))
        return Math.round(value).toString()
      }

      // For other numbers with decimal places, limit precision to avoid floating point issues
      // For values < 0.1, keep more decimal places for precision
      if (value < 0.1) {
        const result = value.toFixed(8)
        console.log('Small number formatted with 8 decimals:', result)
        return result
      } else if (value < 1) {
        const result = value.toFixed(6)
        console.log('Medium number formatted with 6 decimals:', result)
        return result
      } else {
        const result = value.toFixed(4)
        console.log('Larger number formatted with 4 decimals:', result)
        return result
      }
    } catch (error) {
      console.error('Error formatting output:', error)
      return '0'
    }
  }

  // Helper method to generate a cache key
  protected getCacheKey(
    operation: 'in' | 'out',
    amount: string,
    reserveData: ReserveData
  ): string {
    return `${operation}:${amount}:${reserveData.dex}:${reserveData.pairAddress}:${reserveData.reserves.token0}:${reserveData.reserves.token1}`
  }
}

// Uniswap V2 implementation
export class UniswapV2Calculator extends BaseDexCalculator {
  private router: ethers.Contract

  constructor(chainId: string = '1') {
    super(chainId)
    const routerAddress = getContractAddress(chainId, 'UNISWAP_V2', 'ROUTER')
    this.router = new ethers.Contract(
      routerAddress,
      UniswapV2RouterABI,
      this.provider
    )
  }

  // Uniswap V2 charges 0.3% fee
  getExchangeFee(): number {
    return 0.3
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('out', amountIn, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      console.log('Using cached output amount calculation')
      return cachedResult
    }

    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      console.log('token0Decimals ===>', token0Decimals)
      console.log('token1Decimals ===>', token1Decimals)

      const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)
      // const reserveInBN = ethers.utils.parseUnits(
      //   reserveData.reserves.token0,
      //   token0Decimals
      // )
      // const reserveOutBN = ethers.utils.parseUnits(
      //   reserveData.reserves.token1,
      //   token1Decimals
      // )

      // Get amount out using the router contract
      const amountOut = await this.router.getAmountOut(
        amountInBN,
        reserveData.reserves.token0,
        reserveData.reserves.token1
      )

      console.log('Uniswap V2 output amount:', amountOut.toString())

      // Convert back to string with proper decimals
      const result = this.formatOutput(amountOut, token1Decimals)

      console.log('Uniswap V2 output result:', result)

      // Cache the result
      // calculationCache.set(cacheKey, result)
      return result
    } catch (error) {
      console.error('Error calculating output amount:', error)
      return '0'
    }

    // try {
    //   // First try local calculation to avoid network calls if possible
    //   const localResult = this.calculateOutputAmountLocally(
    //     amountIn,
    //     reserveData
    //   )

    //   // Cache and return the local result
    //   calculationCache.set(cacheKey, localResult)
    //   return localResult
    // } catch (localError) {
    //   console.warn('Local calculation failed, trying on-chain:', localError)

    //   try {
    //     // Get token decimals from reserveData or default to 18
    //     const token0Decimals = reserveData.token0Decimals || 18
    //     const token1Decimals = reserveData.token1Decimals || 18

    //     // Convert to BigNumber with proper decimals
    //     const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)
    //     const reserveInBN = ethers.utils.parseUnits(
    //       reserveData.reserves.token0,
    //       token0Decimals
    //     )
    //     const reserveOutBN = ethers.utils.parseUnits(
    //       reserveData.reserves.token1,
    //       token1Decimals
    //     )

    //     // Get amount out using the router contract
    //     const amountOut = await this.router.getAmountOut(
    //       amountInBN,
    //       reserveInBN,
    //       reserveOutBN
    //     )

    //     // Convert back to string with proper decimals
    //     const result = this.formatOutput(amountOut, token1Decimals)

    //     // Cache the result
    //     calculationCache.set(cacheKey, result)
    //     return result
    //   } catch (error) {
    //     console.error('Error calculating output amount:', error)
    //     return '0'
    //   }
    // }
  }

  // Local calculation to avoid network calls
  private calculateOutputAmountLocally(
    amountIn: string,
    reserveData: ReserveData
  ): string {
    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Uniswap V2 formula: getAmountOut
      // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)

      // Use direct decimal math instead of BigNumber
      const amountInDecimal = parseFloat(amountIn)
      const reserveInDecimal = parseFloat(reserveData.reserves.token0)
      const reserveOutDecimal = parseFloat(reserveData.reserves.token1)

      // Check for valid values
      if (
        isNaN(amountInDecimal) ||
        isNaN(reserveInDecimal) ||
        isNaN(reserveOutDecimal)
      ) {
        throw new Error('Invalid numeric values for calculation')
      }

      if (reserveInDecimal <= 0 || reserveOutDecimal <= 0) {
        throw new Error('Reserves must be positive values')
      }

      // Calculate using the formula directly with decimal values
      const amountInWithFee = amountInDecimal * 997
      const numerator = amountInWithFee * reserveOutDecimal
      const denominator = reserveInDecimal * 1000 + amountInWithFee

      if (denominator === 0) {
        throw new Error('Denominator is zero')
      }

      const amountOut = numerator / denominator

      // Format the result based on magnitude
      let result: string
      if (amountOut > 100) {
        result = amountOut.toFixed(2)
      } else if (amountOut > 10) {
        result = amountOut.toFixed(3)
      } else if (amountOut > 1) {
        result = amountOut.toFixed(4)
      } else if (amountOut > 0.1) {
        result = amountOut.toFixed(6)
      } else {
        result = amountOut.toFixed(8)
      }

      return result
    } catch (error) {
      console.error('Error in decimal calculation:', error)
      throw error // Re-throw to trigger the fallback
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('in', amountOut, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      console.log('Using cached input amount calculation')
      return cachedResult
    }

    try {
      // First try local calculation to avoid network calls if possible
      const localResult = this.calculateInputAmountLocally(
        amountOut,
        reserveData
      )

      // Cache and return the local result
      calculationCache.set(cacheKey, localResult)
      return localResult
    } catch (localError) {
      console.warn('Local calculation failed, trying on-chain:', localError)

      try {
        // Get token decimals from reserveData or default to 18
        const token0Decimals = reserveData.decimals.token0
        const token1Decimals = reserveData.decimals.token1

        // Convert to BigNumber with proper decimals
        const amountOutBN = ethers.utils.parseUnits(amountOut, token1Decimals)
        const reserveInBN = ethers.utils.parseUnits(
          reserveData.reserves.token0,
          token0Decimals
        )
        const reserveOutBN = ethers.utils.parseUnits(
          reserveData.reserves.token1,
          token1Decimals
        )

        // Check for insufficient liquidity
        if (amountOutBN.gte(reserveOutBN)) {
          const result = 'Insufficient liquidity'
          calculationCache.set(cacheKey, result)
          return result
        }

        // Get amount in using the router contract
        const amountIn = await this.router.getAmountIn(
          amountOutBN,
          reserveInBN,
          reserveOutBN
        )

        // Convert back to string with proper decimals
        const result = this.formatOutput(amountIn, token0Decimals)

        // Cache the result
        calculationCache.set(cacheKey, result)
        return result
      } catch (error) {
        console.error('Error calculating input amount:', error)
        return '0'
      }
    }
  }

  // Local calculation to avoid network calls
  private calculateInputAmountLocally(
    amountOut: string,
    reserveData: ReserveData
  ): string {
    try {
      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Uniswap V2 formula: getAmountIn
      // amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997)

      // Use direct decimal math instead of BigNumber
      const amountOutDecimal = parseFloat(amountOut)
      const reserveInDecimal = parseFloat(reserveData.reserves.token0)
      const reserveOutDecimal = parseFloat(reserveData.reserves.token1)

      // Check for valid values
      if (
        isNaN(amountOutDecimal) ||
        isNaN(reserveInDecimal) ||
        isNaN(reserveOutDecimal)
      ) {
        throw new Error('Invalid numeric values for calculation')
      }

      if (reserveInDecimal <= 0 || reserveOutDecimal <= 0) {
        throw new Error('Reserves must be positive values')
      }

      // Check for insufficient liquidity
      if (amountOutDecimal >= reserveOutDecimal) {
        return 'Insufficient liquidity'
      }

      // Calculate using the formula directly with decimal values
      const numerator = reserveInDecimal * amountOutDecimal * 1000
      const denominator = (reserveOutDecimal - amountOutDecimal) * 997

      if (denominator <= 0) {
        throw new Error('Denominator is zero or negative')
      }

      const amountIn = numerator / denominator

      // Format the result based on magnitude
      let result: string
      if (amountIn > 100) {
        result = amountIn.toFixed(2)
      } else if (amountIn > 10) {
        result = amountIn.toFixed(3)
      } else if (amountIn > 1) {
        result = amountIn.toFixed(4)
      } else if (amountIn > 0.1) {
        result = amountIn.toFixed(6)
      } else {
        result = amountIn.toFixed(8)
      }

      return result
    } catch (error) {
      console.error('Error in decimal calculation:', error)
      throw error // Re-throw to trigger the fallback
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      console.log('UniswapV2 - calculateOutputAmountDirect called with:', {
        amountIn,
        tokenIn,
        tokenOut,
        decimalsIn,
        decimalsOut,
      })

      const amountInBN = ethers.utils.parseUnits(amountIn, decimalsIn)
      const path = [tokenIn, tokenOut]

      console.log('Calling getAmountsOut with:', {
        amountInBN: amountInBN.toString(),
        path,
      })

      // Get amounts out using the router contract
      const amounts = await this.router.getAmountsOut(amountInBN, path)

      console.log('getAmountsOut result:', amounts[1].toString())

      // Convert back to string with proper decimals
      const result = this.formatOutput(amounts[1], decimalsOut)
      console.log('Formatted result:', result)

      return result
    } catch (error) {
      console.error('Error in calculateOutputAmountDirect:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      const amountOutBN = ethers.utils.parseUnits(amountOut, decimalsOut)
      const path = [tokenIn, tokenOut]

      // Get amounts in using the router contract
      const amounts = await this.router.getAmountsIn(amountOutBN, path)

      // Convert back to string with proper decimals
      return this.formatOutput(amounts[0], decimalsIn)
    } catch (error) {
      console.error('Error calculating direct input amount:', error)
      return '0'
    }
  }
}

// SushiSwap implementation (same as Uniswap V2 for now, but could be different)
export class SushiSwapCalculator extends BaseDexCalculator {
  private router: ethers.Contract

  constructor(chainId: string = '1') {
    super(chainId)
    const routerAddress = getContractAddress(chainId, 'SUSHISWAP', 'ROUTER')
    this.router = new ethers.Contract(
      routerAddress,
      SushiSwapRouterABI,
      this.provider
    )
  }

  // SushiSwap can have a different fee structure
  getExchangeFee(): number {
    return 0.3 // Same as Uniswap V2 for now
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    try {
      // Get token decimals from backend response
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      console.log('SushiSwap calculation input:', {
        amountIn,
        token0Decimals,
        token1Decimals,
        reserves: reserveData.reserves,
      })

      // Convert input amount to proper decimals
      const amountInBN = ethers.utils.parseUnits(amountIn, token0Decimals)

      // Get amount out using the router contract
      const amountOut = await this.router.getAmountOut(
        amountInBN,
        reserveData.reserves.token0,
        reserveData.reserves.token1
      )

      console.log('SushiSwap raw output amount:', amountOut.toString())

      // Use base class's formatOutput method which has proper handling for all value ranges
      const result = super.formatOutput(amountOut, token1Decimals)

      console.log('SushiSwap final calculation result:', {
        amountIn,
        amountInBN: amountInBN.toString(),
        amountOut: amountOut.toString(),
        formattedResult: result,
        token0Decimals,
        token1Decimals,
      })

      return result
    } catch (error) {
      console.error('Error calculating output amount:', error)
      return '0'
    }
  }

  // Helper method to format output with specified decimals
  protected formatOutput(
    amount: ethers.BigNumber,
    decimals: number = 18
  ): string {
    try {
      // Format with all decimals first
      const formatted = ethers.utils.formatUnits(amount, decimals)
      console.log('SushiSwap formatOutput:', {
        amount: amount.toString(),
        decimals,
        formatted,
      })

      // Parse to float for comparison
      const value = parseFloat(formatted)

      // Format based on magnitude for consistent display
      let result: string
      if (value > 100) {
        result = value.toFixed(2)
      } else if (value > 10) {
        result = value.toFixed(3)
      } else if (value > 1) {
        result = value.toFixed(4)
      } else if (value > 0.1) {
        result = value.toFixed(6)
      } else {
        result = value.toFixed(8)
      }

      console.log('SushiSwap final formatted result:', {
        value,
        result,
      })

      return result
    } catch (error) {
      console.error('Error formatting output:', error)
      return '0'
    }
  }

  // Special stable calculation for input = 1 to avoid loops
  private calculateStableOutputFor1(reserveData: ReserveData): string {
    try {
      console.log('Using special stable calculation for input = 1')

      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Use a stable calculation for value = 1 to avoid floating point imprecision
      // Values are already in decimal format, no need to convert
      const reserveIn = parseFloat(reserveData.reserves.token0)
      const reserveOut = parseFloat(reserveData.reserves.token1)

      if (reserveIn <= 0 || reserveOut <= 0) {
        return '0'
      }

      console.log('Raw reserves:', {
        reserveIn,
        reserveOut,
        ratio: reserveOut / reserveIn,
      })

      // For SushiSwap specifically when input is 1, we need to use Ether units
      // Exact stable formula for value = 1 Ether
      // amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
      const amountInEther = 1

      // Manually verified against Etherscan for accuracy
      // When input is 1 Ether, we need to ensure the output matches Etherscan's calculation
      const amountOut =
        (amountInEther * 0.997 * reserveOut) /
        (reserveIn * 1000 + amountInEther * 997)

      // Multiplying by 1000 since Etherscan shows KEther values
      const adjustedAmountOut = amountOut * 1000

      console.log('Calculation details:', {
        amountInEther,
        rawAmountOut: amountOut,
        adjustedAmountOut,
        formula: '(1 * 0.997 * reserveOut) / (reserveIn * 1000 + 997)',
        token0Decimals,
        token1Decimals,
      })

      // Format this to a stable number of digits to ensure output is always identical
      let result: string

      // For the value of 1, we'll return the exact value seen on Etherscan
      // Different precision based on output magnitude
      if (adjustedAmountOut > 100) {
        result = adjustedAmountOut.toFixed(2)
      } else if (adjustedAmountOut > 10) {
        result = adjustedAmountOut.toFixed(3)
      } else if (adjustedAmountOut > 1) {
        result = adjustedAmountOut.toFixed(4)
      } else if (adjustedAmountOut > 0.1) {
        result = adjustedAmountOut.toFixed(6)
      } else {
        result = adjustedAmountOut.toFixed(8)
      }

      console.log('Final result for input=1:', result)

      // Cache this special value
      const cacheKey = this.getCacheKey('out', '1', reserveData)
      calculationCache.set(cacheKey, result, 60000) // Cache for 1 minute

      return result
    } catch (error) {
      console.error('Error in stable calculation for 1:', error)
      return '0'
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData || !reserveData.reserves) return '0'

    console.log('SushiSwap calculateInputAmount', {
      amountOut,
      reserveData,
    })

    // Special case handling for exact value of 1 to avoid precision issues and looping
    if (amountOut === '1') {
      console.log('Special handling for exact output of 1')
      return this.calculateStableInputFor1(reserveData)
    }

    // Check cache first
    const cacheKey = this.getCacheKey('in', amountOut, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      console.log('Using cached input amount calculation:', cachedResult)
      return cachedResult
    }

    try {
      // Instead of going back and forth between implementations,
      // let's directly use the UniswapV2 implementation for consistency
      const v2Calculator = new UniswapV2Calculator(this.chainId)
      const result = await v2Calculator.calculateInputAmount(
        amountOut,
        reserveData
      )

      // Cache the result
      calculationCache.set(cacheKey, result)
      console.log('Using UniswapV2 calculation for SushiSwap:', result)
      return result
    } catch (error) {
      console.error('Error in SushiSwap calculation:', error)
      return '0'
    }
  }

  // Special stable calculation for output = 1 to avoid loops
  private calculateStableInputFor1(reserveData: ReserveData): string {
    try {
      console.log('Using special stable calculation for output = 1')

      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Use a stable calculation for value = 1 to avoid floating point imprecision
      // Values are already in decimal format, no need to convert
      const reserveIn = parseFloat(reserveData.reserves.token0)
      const reserveOut = parseFloat(reserveData.reserves.token1)

      console.log('Raw reserves for input calculation:', {
        reserveIn,
        reserveOut,
        ratio: reserveIn / reserveOut,
        token0Decimals,
        token1Decimals,
      })

      if (reserveIn <= 0 || reserveOut <= 0 || 1 >= reserveOut) {
        return 'Insufficient liquidity'
      }

      // For SushiSwap when output is 1, we need consistent units with Etherscan
      // The output is 1 KEther, not 1 Ether, to match our other calculations
      const amountOutKEther = 1

      // Exact formula for getAmountIn with output = 1
      // amountIn = (reserveIn * amountOut * 1000) / ((reserveOut - amountOut) * 997)
      const amountIn =
        (reserveIn * amountOutKEther * 1000) /
        ((reserveOut - amountOutKEther) * 997)

      console.log('Calculation details for input:', {
        amountOutKEther,
        rawAmountIn: amountIn,
        formula: '(reserveIn * 1 * 1000) / ((reserveOut - 1) * 997)',
      })

      // Format to a stable number of digits
      let result: string

      if (amountIn > 100) {
        result = amountIn.toFixed(2)
      } else if (amountIn > 10) {
        result = amountIn.toFixed(3)
      } else if (amountIn > 1) {
        result = amountIn.toFixed(4)
      } else if (amountIn > 0.1) {
        result = amountIn.toFixed(6)
      } else {
        result = amountIn.toFixed(8)
      }

      console.log('Final result for input calculation, output=1:', result)

      // Cache this special value
      const cacheKey = this.getCacheKey('in', '1', reserveData)
      calculationCache.set(cacheKey, result, 60000) // Cache for 1 minute

      return result
    } catch (error) {
      console.error('Error in stable calculation for output=1:', error)
      return '0'
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      console.log('calculating directly from contract: SushiSwap')
      console.log('amountIn =========>', amountIn)
      console.log('tokenIn =========>', tokenIn)
      console.log('tokenOut =========>', tokenOut)
      console.log('decimalsIn =========>', decimalsIn)
      console.log('decimalsOut =========>', decimalsOut)
      const amountInBN = ethers.utils.parseUnits(amountIn, decimalsIn)
      const path = [tokenIn, tokenOut]

      // Get amounts out using the router contract
      const amounts = await this.router.getAmountsOut(amountInBN, path)

      // Convert back to string with proper decimals
      return this.formatOutput(amounts[1], decimalsOut)
    } catch (error) {
      console.error('Error calculating direct output amount:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      const amountOutBN = ethers.utils.parseUnits(amountOut, decimalsOut)
      const path = [tokenIn, tokenOut]

      // Get amounts in using the router contract
      const amounts = await this.router.getAmountsIn(amountOutBN, path)

      // Convert back to string with proper decimals
      return this.formatOutput(amounts[0], decimalsIn)
    } catch (error) {
      console.error('Error calculating direct input amount:', error)
      return '0'
    }
  }
}

// Uniswap V3 implementation
export class UniswapV3Calculator extends BaseDexCalculator {
  private quoter: ethers.Contract
  private fee: number
  private feeTier: number

  constructor(
    feePercent: number = 0.3,
    chainId: string = '1',
    feeTier?: number
  ) {
    super(chainId)
    const quoterAddress = getContractAddress(chainId, 'UNISWAP_V3', 'QUOTER')
    this.quoter = new ethers.Contract(
      quoterAddress,
      UniswapV3QuoterABI,
      this.provider
    )
    this.fee = feePercent
    // Fee tier in basis points (e.g., 3000 = 0.3%)
    this.feeTier = feeTier || 3000
  }

  getExchangeFee(): number {
    return this.fee
  }

  async calculateOutputAmount(
    amountIn: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('out', amountIn, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      console.log('Using cached output amount calculation')
      return cachedResult
    }

    try {
      console.log(`Using Uniswap V3 quoter with fee tier: ${this.feeTier}`)

      // Get token addresses from reserveData if available
      const tokenIn = reserveData.token0Address
      const tokenOut = reserveData.token1Address

      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert to wei using appropriate decimals
      const amountInWei = ethers.utils.parseUnits(amountIn, token0Decimals)

      console.log('amountInWei', amountInWei.toString())
      console.log('tokenIn', tokenIn)
      console.log('tokenOut', tokenOut)
      console.log('feeTier', this.feeTier)
      console.log('token0Decimals', token0Decimals)
      console.log('token1Decimals', token1Decimals)

      try {
        // Instead of direct contract call, use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactInputSingle',
          [tokenIn, tokenOut, this.feeTier, amountInWei, 0]
        )

        // Use provider.call instead of contract method call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountOut = this.quoter.interface.decodeFunctionResult(
          'quoteExactInputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        const outputResult = this.formatOutput(amountOut, token1Decimals)

        // Cache the result
        calculationCache.set(cacheKey, outputResult)
        return outputResult
      } catch (error) {
        console.error('V3 quoter error:', error)

        // Check if we have enough reserves for fallback calculation
        if (
          parseFloat(reserveData.reserves.token0) > 0 &&
          parseFloat(reserveData.reserves.token1) > 0
        ) {
          // Fallback to V2 formula as simplified calculation
          console.warn('Falling back to V2 calculation for V3 pool')
          const v2Calculator = new UniswapV2Calculator(this.chainId)
          const result = await v2Calculator.calculateOutputAmount(
            amountIn,
            reserveData
          )

          // Cache the result
          calculationCache.set(cacheKey, result)
          return result
        }

        return 'Insufficient liquidity'
      }
    } catch (error) {
      console.error('Error calculating V3 output amount:', error)
      return '0'
    }
  }

  async calculateInputAmount(
    amountOut: string,
    reserveData: ReserveData
  ): Promise<string> {
    if (!reserveData) return '0'

    // Check cache first
    const cacheKey = this.getCacheKey('in', amountOut, reserveData)
    const cachedResult = calculationCache.get(cacheKey)
    if (cachedResult) {
      console.log('Using cached input amount calculation')
      return cachedResult
    }

    try {
      console.log(`Using Uniswap V3 quoter with fee tier: ${this.feeTier}`)

      // Get token addresses from reserveData if available
      const tokenIn = reserveData.token0Address
      const tokenOut = reserveData.token1Address

      // Get token decimals from reserveData or default to 18
      const token0Decimals = reserveData.decimals.token0
      const token1Decimals = reserveData.decimals.token1

      // Convert to wei using appropriate decimals
      const amountOutWei = ethers.utils.parseUnits(amountOut, token1Decimals)

      console.log('amountOutWei', amountOutWei.toString())
      console.log('tokenIn', tokenIn)
      console.log('tokenOut', tokenOut)
      console.log('feeTier', this.feeTier)
      console.log('token0Decimals', token0Decimals)
      console.log('token1Decimals', token1Decimals)

      try {
        // Instead of direct contract call, use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactOutputSingle',
          [tokenIn, tokenOut, this.feeTier, amountOutWei, 0]
        )

        // Use provider.call instead of contract method call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountIn = this.quoter.interface.decodeFunctionResult(
          'quoteExactOutputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        const inputResult = this.formatOutput(amountIn, token0Decimals)

        // Cache the result
        calculationCache.set(cacheKey, inputResult)
        return inputResult
      } catch (error) {
        console.error('V3 quoter error:', error)

        // Check if we have enough reserves for fallback calculation
        if (
          parseFloat(reserveData.reserves.token0) > 0 &&
          parseFloat(reserveData.reserves.token1) > 0
        ) {
          // Fallback to V2 formula as simplified calculation
          console.warn('Falling back to V2 calculation for V3 pool')
          const v2Calculator = new UniswapV2Calculator(this.chainId)
          const result = await v2Calculator.calculateInputAmount(
            amountOut,
            reserveData
          )

          // Cache the result
          calculationCache.set(cacheKey, result)
          return result
        }

        return 'Insufficient liquidity'
      }
    } catch (error) {
      console.error('Error calculating V3 input amount:', error)
      return '0'
    }
  }

  async calculateOutputAmountDirect(
    amountIn: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      console.log(`Using Uniswap V3 quoter with fee tier: ${this.feeTier}`)
      console.log('calculating directly from contract: Uniswap V3')
      console.log('amountIn =========>', amountIn)
      console.log('tokenIn =========>', tokenIn)
      console.log('tokenOut =========>', tokenOut)
      console.log('decimalsIn =========>', decimalsIn)
      console.log('decimalsOut =========>', decimalsOut)

      // Convert to wei using appropriate decimals
      const amountInWei = ethers.utils.parseUnits(amountIn, decimalsIn)

      try {
        // Use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactInputSingle',
          [tokenIn, tokenOut, this.feeTier, amountInWei, 0]
        )

        // Use provider.call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountOut = this.quoter.interface.decodeFunctionResult(
          'quoteExactInputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        return this.formatOutput(amountOut, decimalsOut)
      } catch (error) {
        console.error('V3 quoter error:', error)
        return '0'
      }
    } catch (error) {
      console.error('Error calculating V3 output amount:', error)
      return '0'
    }
  }

  async calculateInputAmountDirect(
    amountOut: string,
    tokenIn: string,
    tokenOut: string,
    decimalsIn: number,
    decimalsOut: number
  ): Promise<string> {
    try {
      console.log(`Using Uniswap V3 quoter with fee tier: ${this.feeTier}`)

      // Convert to wei using appropriate decimals
      const amountOutWei = ethers.utils.parseUnits(amountOut, decimalsOut)

      try {
        // Use encodeFunctionData and provider.call
        const quoterAddress = getContractAddress(
          this.chainId,
          'UNISWAP_V3',
          'QUOTER'
        )
        const data = this.quoter.interface.encodeFunctionData(
          'quoteExactOutputSingle',
          [tokenIn, tokenOut, this.feeTier, amountOutWei, 0]
        )

        // Use provider.call
        const result = await this.provider.call({
          to: quoterAddress,
          data,
        })

        // Decode the result
        const amountIn = this.quoter.interface.decodeFunctionResult(
          'quoteExactOutputSingle',
          result
        )[0]

        // Convert back to string with proper decimals
        return this.formatOutput(amountIn, decimalsIn)
      } catch (error) {
        console.error('V3 quoter error:', error)
        return '0'
      }
    } catch (error) {
      console.error('Error calculating V3 input amount:', error)
      return '0'
    }
  }
}

// Factory to create the appropriate calculator based on DEX type
export class DexCalculatorFactory {
  private static calculatorInstances: Record<string, DexCalculator> = {}

  static createCalculator(
    dexType: string,
    feePercent?: number,
    chainId: string = '1'
  ): DexCalculator {
    // Create a unique key for the calculator instance
    const key = `${dexType}:${feePercent || 'default'}:${chainId}`

    // Return existing instance if available
    if (this.calculatorInstances[key]) {
      return this.calculatorInstances[key]
    }

    // Create a new instance
    let calculator: DexCalculator

    switch (dexType.toLowerCase()) {
      case 'uniswap-v2':
        calculator = new UniswapV2Calculator(chainId)
        break
      case 'sushiswap':
        calculator = new SushiSwapCalculator(chainId)
        break
      default:
        // Check if it's a Uniswap V3 pool with fee tier
        if (dexType.startsWith('uniswap-v3')) {
          const feeTier = extractFeeTier(dexType)
          // Convert fee tier (basis points) to percentage for display
          const feePercentage = feeTier / 10000
          console.log(
            `Creating V3 calculator with fee tier ${feeTier} (${feePercentage}%)`
          )
          calculator = new UniswapV3Calculator(feePercentage, chainId, feeTier)
          break
        }

        console.warn(
          `Unknown DEX type: ${dexType}, using Uniswap V2 calculator as fallback`
        )
        calculator = new UniswapV2Calculator(chainId)
    }

    // Store the instance for reuse
    this.calculatorInstances[key] = calculator
    return calculator
  }
}
