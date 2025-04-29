import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ethers } from 'ethers';
import { PriceAggregator } from '../../services/price-aggregator';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const priceAggregator = new PriceAggregator(provider);

interface PriceRequest {
  tokenA: string;
  tokenB: string;
  dexes?: string[]; // Optional: specify which DEXes to query
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

    // Handle both GET and POST requests
    if (event.httpMethod === 'GET') {
      tokenA = event.queryStringParameters?.tokenA;
      tokenB = event.queryStringParameters?.tokenB;
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

    const prices = await priceAggregator.getBestPrice(tokenA, tokenB);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(prices)
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