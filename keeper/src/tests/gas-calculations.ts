import { ethers } from 'ethers';
import { createProvider } from '../utils/provider';
import { DecimalUtils } from '../utils/decimals';
import axios from 'axios';
import {
  CONTRACT_ADDRESSES, CONTRACT_ABIS
} from '../config/dex'

// Create provider with better throttling and retry settings
const provider = createProvider();

interface GasCalculationResult {
  botGasLimit: bigint;
  streamCount: number;
}

// Utility to get average block time over the last N blocks
async function getAverageBlockTime(provider: ethers.Provider, numBlocks: number = 100): Promise<number> {
  const latestBlock = await provider.getBlock('latest');
  if (!latestBlock) {
    throw new Error('Failed to fetch latest block');
  }
  const latestBlockNumber = latestBlock.number;
  const pastBlock = await provider.getBlock(latestBlockNumber - numBlocks);
  if (!pastBlock) {
    throw new Error('Failed to fetch past block');
  }

  const timeDiff = latestBlock.timestamp - pastBlock.timestamp;
  return timeDiff / numBlocks; // average seconds per block
}

async function calculateGasAllowance(
  provider: ethers.Provider,
  streamCount: number,
): Promise<bigint> {
  
  // Get current gas price
  const gasPrice = await provider.getFeeData();
  if (!gasPrice.gasPrice) {
    throw new Error('Failed to get gas price');
  }

  // // Base gas limit for a single stream execution
  // const nominalGas = 400000n; // Example value

  // Calculate nominalGas for roughly $1 worth of gas
  // TODO: Get ETH price from API
  const ETH_PRICE_USD = 2527n;
  const ONE_DOLLAR_IN_WEI = 1n * 10n ** 18n / ETH_PRICE_USD; // Convert $1 to wei
  const nominalGas = ONE_DOLLAR_IN_WEI / gasPrice.gasPrice;
  
  // Calculate total gas cost for all streams
  const totalGasCost = gasPrice.gasPrice * nominalGas * BigInt(streamCount);

  console.log('nominalGas', nominalGas.toString());
  console.log('gasPrice (wei)', gasPrice.gasPrice.toString());
  console.log('streamCount', streamCount);
  console.log('totalGasCostWei', totalGasCost.toString());
  console.log('gasInEth', (Number(totalGasCost) / 1e18).toString());
  
  // Total gas allowance
  return totalGasCost;
}

function calculateSweetSpot(
  tradeVolume: bigint,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number
): number {
  // Sweet spot formula: N = sqrt(alpha * V^2)
  // where:
  // N = number of streams
  // V = trade volume
  // alpha = reserveA/reserveB^2 (or reserveB/reserveA^2 depending on the magnitude of the reserves)
  
  // Convert all values to ETH format (not wei)
  const scaledReserveA = Number(reserveA) / (10 ** decimalsA);
  const scaledReserveB = Number(reserveB) / (10 ** decimalsB);
  const scaledVolume = Number(tradeVolume) / (10 ** decimalsA);
  
  console.log('scaledReserveA', scaledReserveA);
  console.log('scaledReserveB', scaledReserveB);
  console.log('tradeVolume', scaledVolume);
  
  // Calculate alpha based on which reserve is larger
  const alpha = scaledReserveA > scaledReserveB 
    ? scaledReserveA / (scaledReserveB * scaledReserveB)
    : scaledReserveB / (scaledReserveA * scaledReserveA);
  console.log('alpha', alpha);

  // Calculate V^2 using ETH format values
  const volumeSquared = scaledVolume * scaledVolume;
  console.log('volumeSquared', volumeSquared);

  let streamCount = 0;

  // Check if reserve ratio is less than 0.001
  const reserveRatio = (scaledReserveB / scaledReserveA) * 100;
  console.log('reserveRatio', reserveRatio);
  if (reserveRatio < 0.001) {
    // Calculate N = sqrt(alpha * V^2)
    streamCount = Math.sqrt(alpha * volumeSquared);
    console.log('Reserve ratio less than 0.001, streamCount = ', streamCount);
  } else {
    // Calculate N = sqrt(V^2 / Rin)
    streamCount = Math.sqrt(volumeSquared / scaledReserveA);
    console.log('Reserve ratio greater than 0.001, streamCount = ', streamCount);
  }

  // If pool depth < 0.2%, set streamCount to 4
  let poolDepth = scaledVolume / scaledReserveA;
  console.log('poolDepth%', poolDepth);
  if (poolDepth < 0.2) {
    console.log('Pool depth less than 0.2%, streamCount = 4');
    streamCount = 4;
  }

  console.log('streamCount', streamCount);

  // Round to nearest integer and ensure minimum value of 4
  return Math.max(4, Math.round(streamCount));
}

export async function testGasCalculations(
  tokenA: string,
  tokenB: string,
  tradeVolume: string
): Promise<GasCalculationResult> {
  try {
    // 1. Get reserves from the API endpoint
    console.log('Fetching reserves from API...');
    const response = await axios.get('http://localhost:3001/dev/reserves', {
      params: {
        tokenA,
        tokenB
      }
    });

    if (!response.data) {
      throw new Error('No reserves found for the token pair');
    }

    const reserves = response.data;

    const reserve0 = BigInt(reserves.reserves.token0);
    const reserve1 = BigInt(reserves.reserves.token1);

    // 3. Convert trade volume to BigInt using token decimals
    const tokenDecimals = reserves.decimals || { token0: 18, token1: 18 };
    const tradeVolumeBN = DecimalUtils.normalizeAmount(tradeVolume, tokenDecimals.token0);

    // 4. Calculate sweet spot
    console.log('Calculating sweet spot...');
    const sweetSpot = calculateSweetSpot(
      tradeVolumeBN,
      reserve0,
      reserve1,
      tokenDecimals.token0,
      tokenDecimals.token1
    );

    // 5. Calculate gas allowance
    console.log('Calculating gas allowance...');
    const gasAllowance = await calculateGasAllowance(
      provider,
      sweetSpot
    );

    const avgBlockTime = await getAverageBlockTime(provider);
    const estimatedTotalTime = avgBlockTime * sweetSpot;
    console.log('avgBlockTime (seconds)', avgBlockTime);
    console.log('estimatedTotalTime (seconds)', estimatedTotalTime);

    return {
      botGasLimit: gasAllowance,
      streamCount: sweetSpot,
    };
  } catch (error) {
    console.error('Error in testGasCalculations:', error);
    throw error;
  }
}

async function calculateSlippageSavings(
  tradeVolume: bigint,
  dex: string,
  feeTier: number,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  tokenIn: string,
  tokenOut: string,
  sweetSpot: number
) {

  console.log('dex', dex);
  console.log('feeTier', feeTier);
  console.log('reserveA', reserveA);
  console.log('reserveB', reserveB);
  console.log('decimalsA', decimalsA);
  console.log('decimalsB', decimalsB);
  console.log('tokenIn', tokenIn);
  if (dex === 'uniswap-v2') {
    // Calculate getAmountsOut from UniswapV2Router
    const router = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER,
      CONTRACT_ABIS.UNISWAP_V2.ROUTER,
      provider
    );
    const amountOut = await router.getAmountOut(
      tradeVolume,
      reserveA,
      reserveB
    );
    return amountOut;
  }
  if (dex === 'uniswap-v3-3000' || dex === 'uniswap-v3-500' || dex === 'uniswap-v3-10000') {
    // Calculate getAmountsOut from UniswapV3Quoter
    const quoter = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
      CONTRACT_ABIS.UNISWAP_V3.QUOTER,
      provider
    );

    const data = quoter.interface.encodeFunctionData(
      'quoteExactInputSingle',
      [tokenIn, tokenOut, feeTier, tradeVolume, 0]
    )

    const result = await provider.call({
      to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
      data,
    })
    // Decode the result
    const dexQuoteAmountOut = quoter.interface.decodeFunctionResult(
      'quoteExactInputSingle',
      result
    )[0]

    const dexQuoteAmountOutinETH = Number(dexQuoteAmountOut) / (10 ** decimalsB);
    console.log('dexQuoteAmountOutinETH', dexQuoteAmountOutinETH);

    // Get a quote for (tradevolume / sweetSpot)
    const sweetSpotQuote = quoter.interface.encodeFunctionData(
      'quoteExactInputSingle',
      [tokenIn, tokenOut, feeTier, tradeVolume / BigInt(sweetSpot), 0]
    )

    const sweetSpotQuoteResult = await provider.call({
      to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
      data: sweetSpotQuote,
    })

    const sweetSpotQuoteAmountOut = quoter.interface.decodeFunctionResult(
      'quoteExactInputSingle',
      sweetSpotQuoteResult
    )[0]

    const sweetSpotQuoteAmountOutinETH = Number(sweetSpotQuoteAmountOut) / (10 ** decimalsB);
    console.log('sweetSpotQuoteAmountOutinETH', sweetSpotQuoteAmountOutinETH);

    // get scaled sweetSpotQuoteAmountOut by multiplying by sweetSpot
    const scaledSweetSpotQuoteAmountOutinETH = sweetSpotQuoteAmountOutinETH * sweetSpot;
    console.log('scaledSweetSpotQuoteAmountOutinETH', scaledSweetSpotQuoteAmountOutinETH);

    return scaledSweetSpotQuoteAmountOutinETH - dexQuoteAmountOutinETH;
  }
  
}

export async function testSlippageSavings(
  tokenA: string,
  tokenB: string,
  tradeVolume: string
) {
  try {
    // 1. Get reserves from the API endpoint
    console.log('Fetching reserves from API...');
    const response = await axios.get('http://localhost:3001/dev/reserves', {
      params: {
        tokenA,
        tokenB
      }
    });

    if (!response.data) {
      throw new Error('No reserves found for the token pair');
    }

    const reserves = response.data;

    const reserve0 = BigInt(reserves.reserves.token0);
    const reserve1 = BigInt(reserves.reserves.token1);

    console.log('reserves decimals', reserves.decimals);

    const tokenDecimals = reserves.decimals || { token0: 18, token1: 18 };
    const tradeVolumeBN = DecimalUtils.normalizeAmount(tradeVolume, tokenDecimals.token0); 

    const dex = reserves.dex;
    const feeTier = parseInt(dex.split('-')[2]) || 3000;

    // 2. Calculate sweet spot
    console.log('Calculating sweet spot...');
    const sweetSpot = calculateSweetSpot(
      tradeVolumeBN,
      reserve0,
      reserve1,
      tokenDecimals.token0,
      tokenDecimals.token1
    );

    // 2. Calculate slippage savings
    console.log('Calculating slippage savings...');
    const slippageSavings = await calculateSlippageSavings(
      tradeVolumeBN,
      dex,
      feeTier,
      reserve0,
      reserve1,
      tokenDecimals.token0,
      tokenDecimals.token1,
      tokenA,
      tokenB,
      sweetSpot
    );

    console.log('Slippage savings:', slippageSavings);
    return slippageSavings;
  } catch (error) {
    console.error('Error in testSlippageSavings:', error);
    throw error;
  }
}


// Example usage:
// const result = await testGasCalculations(
//   '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
//   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
//   '1.0' // 1 ETH
// ); 