import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ethers } from 'ethers';
import { PriceAggregator, DexType } from '../../services/price-aggregator';
import { getCache, setCache, generateCacheKey } from '../../utils/redis';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const priceAggregator = new PriceAggregator(provider);

// Cache TTL in seconds
const CACHE_TTL = 30;

interface PriceRequest {
  tokenA: string;
  tokenB: string;
  dex?: DexType; // Optional: specify which DEX to query
}

function validateTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function parseRequestBody(event: APIGatewayProxyEvent): PriceRequest | null {
  if (!event.body) return null;
  try {
    return JSON.parse(event.body);
  } catch (error) {
    return null;
  }
}

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    let tokenA: string | undefined;
    let tokenB: string | undefined;
    let dex: DexType | undefined;

    // Handle both GET and POST requests
    if (event.httpMethod === 'GET') {
      tokenA = event.queryStringParameters?.tokenA;
      tokenB = event.queryStringParameters?.tokenB;
      dex = event.queryStringParameters?.dex as DexType | undefined;
    } else if (event.httpMethod === 'POST') {
      const body = parseRequestBody(event);
      if (!body) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Invalid request body' })
        };
      }
      tokenA = body.tokenA;
      tokenB = body.tokenB;
      dex = body.dex;
    }

    if (!tokenA || !tokenB) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Both tokenA and tokenB addresses are required' })
      };
    }

    if (!validateTokenAddress(tokenA) || !validateTokenAddress(tokenB)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid token address format' })
      };
    }

    // Generate cache key based on tokens, direction, and DEX if specified
    const cacheKey = generateCacheKey('PRICE', `${tokenA}-${tokenB}${dex ? `-${dex}` : ''}`);

    // Try to get from cache first
    const cachedData = await getCache<any>(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for price of ${tokenA}-${tokenB}${dex ? ` from ${dex}` : ''}`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(cachedData)
      };
    }

    // If not in cache, fetch from API
    console.log(`Cache miss for price of ${tokenA}-${tokenB}${dex ? ` from ${dex}` : ''}, fetching from API...`);
    let response;
    
    if (dex) {
      // Fetch price from specific DEX
      response = await priceAggregator.getPriceFromDex(tokenA, tokenB, dex);
      if (!response) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: `No price found for ${tokenA}-${tokenB} on ${dex}` })
        };
      }
    } else {
      // Fetch prices from all DEXes
      response = await priceAggregator.getAllPrices(tokenA, tokenB);
    }

    // Only store in cache if we have valid data
    if (response && (Array.isArray(response) ? response.length > 0 : Object.keys(response).length > 0)) {
      await setCache(cacheKey, response, CACHE_TTL);
    } else {
      console.log(`Skipping cache for empty response: ${tokenA}-${tokenB}${dex ? ` from ${dex}` : ''}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error('Error in price handler:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
}; 