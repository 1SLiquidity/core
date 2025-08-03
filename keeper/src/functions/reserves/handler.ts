import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { ReservesAggregator, DexType } from '../../services/reserves-aggregator'
import { getCache, setCache, generateCacheKey } from '../../utils/redis'
import { createProvider } from '../../utils/provider'

// Create provider with better throttling and retry settings
const provider = createProvider()
const reservesService = new ReservesAggregator(provider)

// Increase cache TTL to reduce RPC calls
const CACHE_TTL = 120 // 2 minutes to reduce total requests

// Simple semaphore to limit concurrent requests
class Semaphore {
  private permits: number
  private waitingQueue: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--
        resolve()
      } else {
        this.waitingQueue.push(resolve)
      }
    })
  }

  release(): void {
    this.permits++
    if (this.waitingQueue.length > 0) {
      const nextResolve = this.waitingQueue.shift()!
      this.permits--
      nextResolve()
    }
  }
}

// Allow max 1 concurrent reserves request to prevent RPC overload
const requestSemaphore = new Semaphore(1)

interface ReserveRequest {
  tokenA: string
  tokenB: string
  dex?: DexType // Optional: specify which DEX to query
}

function validateTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function parseRequestBody(event: APIGatewayProxyEvent): ReserveRequest | null {
  if (!event.body) return null
  try {
    return JSON.parse(event.body)
  } catch (error) {
    return null
  }
}

export const main = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  }

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  try {
    let tokenA: string | undefined
    let tokenB: string | undefined
    let dex: DexType | undefined

    // Handle both GET and POST requests
    if (event.httpMethod === 'GET') {
      tokenA = event.queryStringParameters?.tokenA
      tokenB = event.queryStringParameters?.tokenB
      dex = event.queryStringParameters?.dex as DexType | undefined
    } else if (event.httpMethod === 'POST') {
      const body = parseRequestBody(event)
      if (!body) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid request',
            message: 'Invalid request body',
          }),
        }
      }
      tokenA = body.tokenA
      tokenB = body.tokenB
      dex = body.dex
    }

    if (!tokenA || !tokenB) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing parameters',
          message: 'Both tokenA and tokenB addresses are required',
        }),
      }
    }

    if (!validateTokenAddress(tokenA) || !validateTokenAddress(tokenB)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid address',
          message: 'One or both token addresses are invalid',
        }),
      }
    }

    // Generate cache key based on tokens and DEX if specified
    const cacheKey = generateCacheKey(
      'RESERVES',
      `${tokenA}-${tokenB}${dex ? `-${dex}` : ''}`
    )

    // Try to get from cache first
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      console.log(`Cache hit for ${tokenA}-${tokenB}`)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cachedData),
      }
    }

    // Acquire semaphore to limit concurrent requests
    console.log(`Acquiring semaphore for ${tokenA}-${tokenB}`)
    await requestSemaphore.acquire()
    console.log(`Semaphore acquired for ${tokenA}-${tokenB}`)

    try {
      // If not in cache, fetch from API
      let reservesData
      try {
        if (dex) {
          reservesData = await reservesService.getReservesFromDex(
            tokenA,
            tokenB,
            dex
          )
        } else {
          reservesData = await reservesService.getAllReserves(tokenA, tokenB)
        }

        if (!reservesData) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              error: 'No liquidity',
              message: 'No liquidity found for the token pair',
            }),
          }
        }

        // Cache the successful result
        await setCache(cacheKey, reservesData, CACHE_TTL)

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(reservesData),
        }
      } catch (error: any) {
        console.error('Error fetching reserves:', error)

        // Handle specific error cases
        if (
          error.message?.includes('timeout') ||
          error.message?.includes('Timeout')
        ) {
          return {
            statusCode: 504,
            headers,
            body: JSON.stringify({
              error: 'Timeout',
              message: 'Request timed out while fetching reserves',
            }),
          }
        }

        if (error.message?.includes('Failed to fetch token information')) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Invalid token',
              message: 'Failed to fetch token information',
            }),
          }
        }

        // Default error response
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Server error',
            message: 'Failed to fetch reserves',
          }),
        }
      }
    } finally {
      // Always release semaphore
      console.log(`Releasing semaphore for ${tokenA}-${tokenB}`)
      requestSemaphore.release()
    }
  } catch (error) {
    console.error('Unhandled error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server error',
        message: 'An unexpected error occurred',
      }),
    }
  }
}
