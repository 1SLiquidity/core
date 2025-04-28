import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DEXService } from '../../services/dex';

const dexService = new DEXService();

interface ReserveRequest {
  tokenA: string;
  tokenB: string;
  dexes?: string[]; // Optional: specify which DEXes to query
}

function validateTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function parseRequestBody(event: APIGatewayProxyEvent): ReserveRequest | null {
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

    const reservesData = await dexService.getReserves(tokenA, tokenB);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(reservesData)
    };
  } catch (error) {
    console.error('Error in reserves handler:', error);
    
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