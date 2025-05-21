import { ethers, providers } from 'ethers';

interface GasCalculationResult {
  botGasLimit: bigint;
  streamCount: number;
}

interface Reserves {
  token0: string;
  token1: string;
}

interface TokenDecimals {
  token0: number;
  token1: number;
}

interface ReservesResponse {
  reserves: Reserves;
  decimals: TokenDecimals;
}

// Utility to normalize amount based on decimals
function normalizeAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0');
  return BigInt(whole + paddedFraction);
}

function calculateSweetSpot(
  tradeVolume: bigint,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number
): number {
  // Convert all values to ETH format (not wei)
  const scaledReserveA = Number(reserveA) / (10 ** decimalsA);
  const scaledReserveB = Number(reserveB) / (10 ** decimalsB);
  const scaledVolume = Number(tradeVolume) / (10 ** decimalsA);
  
  // Calculate alpha based on which reserve is larger
  const alpha = scaledReserveA > scaledReserveB 
    ? scaledReserveA / (scaledReserveB * scaledReserveB)
    : scaledReserveB / (scaledReserveA * scaledReserveA);

  // Calculate V^2 using ETH format values
  const volumeSquared = scaledVolume * scaledVolume;

  // Calculate N = sqrt(alpha * V^2)
  const streamCount = Math.sqrt(alpha * volumeSquared);

  // Round to nearest integer
  return Math.round(streamCount);
}

async function calculateGasAllowance(
  provider: providers.Provider,
  streamCount: number,
): Promise<bigint> {
  // Get current gas price
  const gasPrice = await provider.getFeeData();
  if (!gasPrice.gasPrice) {
    throw new Error('Failed to get gas price');
  }

  // Calculate nominalGas for roughly $1 worth of gas
  const ETH_PRICE_USD = BigInt(2527);
  const ONE_DOLLAR_IN_WEI = BigInt(10) ** BigInt(18) / ETH_PRICE_USD; // Convert $1 to wei
  const gasPriceBigInt = BigInt(gasPrice.gasPrice.toString());
  const nominalGas = ONE_DOLLAR_IN_WEI / gasPriceBigInt;
  
  // Calculate total gas cost for all streams
  const totalGasCost = gasPriceBigInt * nominalGas * BigInt(streamCount);
  
  return totalGasCost;
}

// Utility to fetch and cache average block time
let cachedBlockTime: number | null = null;
let lastBlockTimeFetch = 0;
const BLOCK_TIME_CACHE_MS = 60_000; // 1 minute

export async function getAverageBlockTime(provider: any, numBlocks: number = 20): Promise<number> {
  const now = Date.now();
  if (cachedBlockTime && now - lastBlockTimeFetch < BLOCK_TIME_CACHE_MS) {
    return cachedBlockTime;
  }
  const latestBlock = await provider.getBlockNumber();
  const latest = await provider.getBlock(latestBlock);
  const first = await provider.getBlock(latestBlock - numBlocks);
  if (!latest || !first) return 12; // fallback to 12s
  const avg = (latest.timestamp - first.timestamp) / numBlocks;
  cachedBlockTime = avg;
  lastBlockTimeFetch = now;
  return avg;
}

export async function calculateGasAndStreams(
  provider: providers.Provider,
  tradeVolume: string,
  reserves: ReservesResponse
): Promise<GasCalculationResult> {
  try {
    const reserve0 = BigInt(reserves.reserves.token0);
    const reserve1 = BigInt(reserves.reserves.token1);

    // Convert trade volume to BigInt using token decimals
    const tradeVolumeBN = normalizeAmount(tradeVolume, reserves.decimals.token0);

    // Calculate sweet spot
    const sweetSpot = calculateSweetSpot(
      tradeVolumeBN,
      reserve0,
      reserve1,
      reserves.decimals.token0,
      reserves.decimals.token1
    );

    // Calculate gas allowance
    const gasAllowance = await calculateGasAllowance(
      provider,
      sweetSpot
    );

    return {
      botGasLimit: gasAllowance,
      streamCount: sweetSpot,
    };
  } catch (error) {
    console.error('Error in calculateGasAndStreams:', error);
    throw error;
  }
} 