import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ethers } from 'ethers';
import { DepthAggregator } from '../../services/depth-aggregator';
import { DepthConfig } from '../../types/depth';
import { CONTRACT_ADDRESSES } from '../../config/dex';

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const depthAggregator = new DepthAggregator(provider);

export const main = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse query parameters
    const token0 = event.queryStringParameters?.token0;
    const token1 = event.queryStringParameters?.token1;
    const intervals = event.queryStringParameters?.intervals || '0.01,0.02'; // Default to 1% and 2%
    const maxDepthPoints = parseInt(event.queryStringParameters?.maxDepthPoints || '10');

    if (!token0 || !token1) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameters: token0 and token1'
        })
      };
    }

    // Parse intervals
    const priceIntervals = intervals.split(',').map(Number);

    // Create depth config
    const config: DepthConfig = {
      maxDepthPoints,
      priceIntervals
    };

    // Get depth data
    const depthData = await depthAggregator.getDepth(token0, token1, config);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(depthData)
    };
  } catch (error) {
    console.error('Error in getDepth handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal server error'
      })
    };
  }
}; 