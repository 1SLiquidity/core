import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { ReservesAggregator, DexType } from '../../services/reserves-aggregator'
import { getCache, setCache, generateCacheKey } from '../../utils/redis'
import { createProvider } from '../../utils/provider'
import { initializeCurveFiltering } from '../../services/curve-initializer'
import { CURVE_POOL_METADATA } from '../../../data/curve-config'

// Create provider with better throttling and retry settings
const provider = createProvider()
const reservesService = new ReservesAggregator(provider)

// Initialize Curve smart filtering (only reserves aggregator needed)
reservesService.initializeCurvePoolFilter(CURVE_POOL_METADATA)

// Increase cache TTL to reduce RPC calls
const CACHE_TTL = 10 // 10 seconds

interface ReserveRequest {
  tokenA: string
  tokenB: string
  dex?: DexType // Optional: specify which DEX to query
  poolAddress?: string // Optional: specify pool address for Curve DEX
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
  try {
    let tokenA: string | undefined
    let tokenB: string | undefined
    let dex: DexType | undefined
    let poolAddress: string | undefined

    // Handle both GET and POST requests
    if (event.httpMethod === 'GET') {
      tokenA = event.queryStringParameters?.tokenA
      tokenB = event.queryStringParameters?.tokenB
      dex = event.queryStringParameters?.dex as DexType | undefined
      poolAddress = event.queryStringParameters?.poolAddress
    } else if (event.httpMethod === 'POST') {
      const body = parseRequestBody(event)
      if (!body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid request body' }),
        }
      }
      tokenA = body.tokenA
      tokenB = body.tokenB
      dex = body.dex
      poolAddress = body.poolAddress
    }

    if (!tokenA || !tokenB) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Both tokenA and tokenB addresses are required',
        }),
      }
    }

    if (!validateTokenAddress(tokenA) || !validateTokenAddress(tokenB)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid token address format' }),
      }
    }

    // Generate cache key based on tokens and DEX if specified
    const cacheKey = generateCacheKey(
      'RESERVES',
      `${tokenA}-${tokenB}${dex ? `-${dex}` : ''}`
    )

    // Try to get from cache first
    const cachedData = await getCache<any>(cacheKey)
    if (cachedData) {
      console.log(`Cache hit for reserves of ${tokenA}-${tokenB}${dex ? ` from ${dex}` : ''}`)
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(cachedData),
      }
    }

    // If not in cache, fetch from API
    console.log(
      `Cache miss for reserves of ${tokenA}-${tokenB}${dex ? ` from ${dex}` : ''}, fetching from API...`
    )
    let reservesData
    
    if (dex) {
      // Fetch reserves from specific DEX
      reservesData = await reservesService.getReservesFromDex(tokenA, tokenB, dex, poolAddress)
      if (!reservesData) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: `No reserves found for ${tokenA}-${tokenB} on ${dex}${poolAddress ? ` (${poolAddress})` : ''}` }),
        }
      }
    } else {
      // Fetch reserves from all DEXes
      reservesData = await reservesService.getAllReserves(tokenA, tokenB)
    }

    // Only store in cache if we have valid data
    if (
      reservesData &&
      (Array.isArray(reservesData)
        ? reservesData.length > 0
        : Object.keys(reservesData).length > 0)
    ) {
      await setCache(cacheKey, reservesData, CACHE_TTL)
    } else {
      console.log(`Skipping cache for empty response: ${tokenA}-${tokenB}${dex ? ` from ${dex}` : ''}`)
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(reservesData),
    }
  } catch (error) {
    console.error('Error in reserves handler:', error)

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
