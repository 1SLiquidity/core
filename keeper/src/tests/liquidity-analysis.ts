import { ethers } from 'ethers';
import { createProvider } from '../utils/provider';
import { ReservesAggregator } from '../services/reserves-aggregator';
import { PriceAggregator } from '../services/price-aggregator';
import { TokenService } from '../services/token-service';
import * as dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Create provider
const provider = createProvider();
const reservesAggregator = new ReservesAggregator(provider);
const priceAggregator = new PriceAggregator(provider);
const tokenService = TokenService.getInstance(provider);

// Base tokens to test against (Ethereum addresses)
const BASE_TOKENS = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum WETH
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum USDT
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // Ethereum WBTC
};

// Known token decimals mapping - addresses should be lowercase
const KNOWN_TOKEN_DECIMALS: Record<string, number> = {
  // Ethereum Mainnet
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // USDC
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 8, // WBTC
  '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // WETH
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 18, // ETH (virtual)
  '0x0000000000000000000000000000000000000000': 18, // ETH (native)
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 18, // UNI
  '0x514910771af9ca656af840dff83e8264ecf986ca': 18, // LINK
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 18, // AAVE
  '0x0d8775f648430679a709e98d2b0cb6250d2887ef': 18, // BAT
  '0x4fabb145d64652a948d72533023f6e7a623c7c53': 18, // BUSD
};

// Function to check if a token is an ERC20 token
const NATIVE_TOKEN_ADDRESSES = [
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH (virtual)
  '0x0000000000000000000000000000000000000000', // ETH (native)
];

// Improved function to check if a token is an ERC20 token on a specific platform
const isERC20Token = (
  tokenAddress: string,
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string
): boolean => {
  // No address or no platforms object means it's not a valid ERC20 token
  if (!tokenAddress || !platforms) {
    return false;
  }

  // Check if the token has a valid address on the target platform
  const platformAddress = platforms[targetPlatform];
  if (!platformAddress) {
    return false;
  }

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (tokenAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase().includes('binance'))
  ) {
    console.log(`BNB is not an ERC20 token on Ethereum: ${platformAddress}`);
    return false;
  }

  // Native tokens (ETH) are not ERC20
  if (NATIVE_TOKEN_ADDRESSES.includes(platformAddress.toLowerCase())) {
    console.log(
      `Token address ${platformAddress} is a native token, not an ERC20`
    );
    return false;
  }

  // Valid ERC20 tokens have a proper address format
  const isValid =
    platformAddress !== '' &&
    platformAddress !== '0x' &&
    platformAddress.startsWith('0x') &&
    platformAddress.length === 42;

  if (!isValid) {
    console.log(
      `Token address ${platformAddress} is not a valid ERC20 address format`
    );
  }

  return isValid;
};

// Function to safely get a token address from platforms object
const getTokenAddressForPlatform = (
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string
): string => {
  if (!platforms || !platforms[targetPlatform]) return '';

  const address = platforms[targetPlatform].toLowerCase();

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (address === 'bnb' || address.includes('binance'))
  ) {
    console.log(`Excluded BNB token on Ethereum: ${address}`);
    return '';
  }

  // Exclude native tokens and special cases
  if (
    NATIVE_TOKEN_ADDRESSES.includes(address) ||
    address === 'bnb' || // sometimes BNB is listed like this
    address === '0x0000000000000000000000000000000000000000' ||
    address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
    !address.startsWith('0x') ||
    address === '0x' ||
    address.length !== 42
  ) {
    console.log(`Excluded token with invalid or native address: ${address}`);
    return '';
  }

  return address;
};

interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  market_cap_rank: number;
  market_cap: number;
  current_price: number;
  platforms: {
    [key: string]: string;
  };
}

interface LiquidityResult {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  marketCap: number;
  baseToken: string;
  baseTokenSymbol: string;
  dex: string;
  reserves: {
    token0: string;
    token1: string;
  };
  decimals: {
    token0: number;
    token1: number;
  };
  usdLiquidity: number;
  timestamp: number;
}

interface TokenLiquiditySummary {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  marketCap: number;
  totalLiquidity: number;
  liquidityPairs: LiquidityResult[];
  lowLiquidityScore: number; // Market cap / total liquidity ratio
}

async function fetchTopTokensByMarketCap(limit: number = 100): Promise<TokenInfo[]> {
  console.log(`Fetching top ${limit} ERC20 tokens by market cap from CoinGecko...`);
  
  const tokens: TokenInfo[] = [];
  const targetPlatform = 'ethereum'; // Focus on Ethereum only
  
  try {
    // Fetch tokens by market cap from CoinGecko API
    console.log('Fetching tokens by market cap...');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&locale=en&precision=full`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const allTokens = await response.json() as TokenInfo[];
    console.log(`Successfully fetched ${allTokens.length} tokens`);

    // Fetch token platforms (addresses) for the tokens
    let platformsData = [];
    try {
      const platformsResponse = await fetch(
        'https://api.coingecko.com/api/v3/coins/list?include_platform=true',
        {
          signal: AbortSignal.timeout(5000), // 5 second timeout
          headers: { Accept: 'application/json' },
        }
      );

      if (!platformsResponse.ok) {
        throw new Error(
          `Failed to fetch token platforms: ${platformsResponse.status}`
        );
      }

      platformsData = await platformsResponse.json() as any[];
      console.log(
        `Successfully fetched platform data for ${platformsData.length} tokens`
      );
    } catch (error) {
      console.error('Error fetching token platforms:', error);
      throw error;
    }

    // Merge platforms data with token data
    const enrichedTokens = allTokens.map((token) => {
      const platformInfo = platformsData.find((p: any) => p.id === token.id);
      return {
        ...token,
        platforms: platformInfo?.platforms || {},
      };
    });

    // Filter for ERC20 tokens specifically with addresses on Ethereum
    const erc20Tokens = enrichedTokens.filter((token) => {
      const tokenAddress = getTokenAddressForPlatform(
        token.platforms,
        targetPlatform
      );
      // Use improved function to check if it's an ERC20 token on Ethereum
      return (
        tokenAddress &&
        isERC20Token(tokenAddress, token.platforms, targetPlatform)
      );
    });

    console.log(
      `Filtered ${enrichedTokens.length - erc20Tokens.length} non-ERC20 tokens out of ${enrichedTokens.length} total tokens`
    );

    console.log(
      `Found ${erc20Tokens.length} ERC20 tokens available on ${targetPlatform}`
    );

    return erc20Tokens.slice(0, limit);
  } catch (error) {
    console.error('Error fetching token list:', error);
    throw error;
  }
}

async function getTokenAddressForChain(token: TokenInfo, chain: string = 'ethereum'): Promise<string | null> {
  // Get token address from platforms
  const tokenAddress = getTokenAddressForPlatform(token.platforms, chain);
  
  if (!tokenAddress) {
    console.log(`No ${chain} address found for ${token.symbol}`);
    return null;
  }
  
  // Check if it's a valid ERC20 token
  if (!isERC20Token(tokenAddress, token.platforms, chain)) {
    console.log(`${token.symbol} is not a valid ERC20 token on ${chain}`);
    return null;
  }
  
  return tokenAddress.toLowerCase();
}

async function analyzeTokenLiquidity(token: TokenInfo): Promise<TokenLiquiditySummary | null> {
  const tokenAddress = await getTokenAddressForChain(token, 'ethereum');
  if (!tokenAddress) {
    console.log(`No Ethereum address found for ${token.symbol}, skipping...`);
    return null;
  }
  
  console.log(`\nAnalyzing liquidity for ${token.symbol} (${tokenAddress})...`);
  
  const liquidityPairs: LiquidityResult[] = [];
  let totalLiquidity = 0;
  
  // Test against each base token
  for (const [baseSymbol, baseAddress] of Object.entries(BASE_TOKENS)) {
    console.log(`  Testing against ${baseSymbol}...`);
    
    try {
      // Get reserves from all DEXes
      const reserves = await reservesAggregator.getAllReserves(tokenAddress, baseAddress);
      
      if (reserves) {
        const liquidityResult: LiquidityResult = {
          tokenAddress,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          marketCap: token.market_cap,
          baseToken: baseAddress,
          baseTokenSymbol: baseSymbol,
          dex: reserves.dex,
          reserves: reserves.reserves,
          decimals: reserves.decimals,
          usdLiquidity: 0, // Set to 0 since we removed the calculation
          timestamp: reserves.timestamp,
        };
        
        liquidityPairs.push(liquidityResult);
        totalLiquidity += 0; // Set to 0 since we removed the calculation
        
        console.log(`    Found ${reserves.dex} liquidity`);
      }
    } catch (error) {
      console.warn(`    Error getting reserves for ${token.symbol}/${baseSymbol}:`, error);
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (liquidityPairs.length === 0) {
    console.log(`  No liquidity found for ${token.symbol}`);
    return null;
  }
  
  const lowLiquidityScore = token.market_cap / totalLiquidity;
  
  return {
    tokenAddress,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    marketCap: token.market_cap,
    totalLiquidity,
    liquidityPairs,
    lowLiquidityScore,
  };
}

async function saveTokenToJson(tokenResult: TokenLiquiditySummary, timestamp: string): Promise<void> {
  const jsonFilepath = path.join(__dirname, `liquidity-analysis-${timestamp}.json`);
  
  // Read existing data if file exists
  let existingData: TokenLiquiditySummary[] = [];
  if (fs.existsSync(jsonFilepath)) {
    try {
      const fileContent = fs.readFileSync(jsonFilepath, 'utf8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      console.warn('Error reading existing JSON file, starting fresh:', error);
    }
  }
  
  // Add new token result (or update if it already exists)
  const existingIndex = existingData.findIndex(item => item.tokenAddress === tokenResult.tokenAddress);
  if (existingIndex >= 0) {
    existingData[existingIndex] = tokenResult;
  } else {
    existingData.push(tokenResult);
  }
  
  // Save updated data
  fs.writeFileSync(jsonFilepath, JSON.stringify(existingData, null, 2));
  console.log(`  💾 Saved ${tokenResult.tokenSymbol} data to JSON`);
}

async function generateExcelReport(results: TokenLiquiditySummary[], timestamp: string): Promise<void> {
  console.log('\nGenerating Excel report...');
  
  // Prepare data for Excel
  const excelData = results.map(result => ({
    'Token Symbol': result.tokenSymbol,
    'Token Name': result.tokenName,
    'Token Address': result.tokenAddress,
    'Market Cap (USD)': result.marketCap,
    'Total Liquidity (USD)': result.totalLiquidity,
    'Market Cap / Liquidity Ratio': result.lowLiquidityScore,
    'Liquidity Pairs Count': result.liquidityPairs.length,
    'Low Liquidity Score': result.lowLiquidityScore > 50 ? 'HIGH' : result.lowLiquidityScore > 20 ? 'MEDIUM' : 'LOW',
  }));
  
  // Sort by low liquidity score (highest first)
  excelData.sort((a, b) => b['Market Cap / Liquidity Ratio'] - a['Market Cap / Liquidity Ratio']);
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  // Add summary sheet
  const summarySheet = XLSX.utils.json_to_sheet(excelData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  
  // Add detailed liquidity pairs sheet
  const detailedData = results.flatMap(result =>
    result.liquidityPairs.map(pair => ({
      'Token Symbol': pair.tokenSymbol,
      'Token Name': pair.tokenName,
      'Token Address': pair.tokenAddress,
      'Base Token': pair.baseTokenSymbol,
      'DEX': pair.dex,
      'Reserve Token0': pair.reserves.token0,
      'Reserve Token1': pair.reserves.token1,
      'USD Liquidity': pair.usdLiquidity,
      'Market Cap': pair.marketCap,
      'Timestamp': new Date(pair.timestamp).toISOString(),
    }))
  );
  
  const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
  XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Pairs');
  
  // Save to file using provided timestamp
  const filename = `liquidity-analysis-${timestamp}.xlsx`;
  const filepath = path.join(__dirname, filename);
  
  XLSX.writeFile(workbook, filepath);
  console.log(`Excel report saved to: ${filepath}`);
}

async function runLiquidityAnalysis(jsonFilePath?: string): Promise<void> {
  try {
    let existingData: TokenLiquiditySummary[] = [];
    let timestamp: string;
    let isResume = false;
    
    if (jsonFilePath) {
      // Resume mode
      console.log(`Resuming liquidity analysis from: ${jsonFilePath}`);
      
      // Check if file exists
      if (!fs.existsSync(jsonFilePath)) {
        console.error(`File not found: ${jsonFilePath}`);
        return;
      }
      
      // Load existing data
      const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
      existingData = JSON.parse(fileContent);
      
      console.log(`Loaded ${existingData.length} existing tokens from JSON file`);
      
      // Extract timestamp from filename
      const filename = path.basename(jsonFilePath);
      const timestampMatch = filename.match(/liquidity-analysis-(.+)\.json/);
      if (!timestampMatch) {
        console.error('Could not extract timestamp from filename');
        return;
      }
      timestamp = timestampMatch[1];
      isResume = true;
      
      console.log(`Resuming with timestamp: ${timestamp}`);
    } else {
      // Start from scratch mode
      console.log('Starting liquidity analysis for top ERC20 tokens on Ethereum...');
      
      // Create timestamp for this run
      timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      console.log(`Using timestamp: ${timestamp}`);
    }
    
    // Get list of already processed token addresses (if resuming)
    const processedAddresses = new Set(existingData.map(item => item.tokenAddress.toLowerCase()));
    if (isResume) {
      console.log(`Already processed ${processedAddresses.size} tokens`);
    }
    
    // Fetch top tokens
    const topTokens = await fetchTopTokensByMarketCap(250);
    console.log(`\nFetched ${topTokens.length} top ERC20 tokens`);
    
    if (topTokens.length === 0) {
      console.log('No ERC20 tokens found, exiting...');
      return;
    }
    
    // Filter tokens based on mode
    let tokensToProcess: TokenInfo[];
    if (isResume) {
      // Filter out already processed tokens
      tokensToProcess = topTokens.filter(token => {
        const tokenAddress = getTokenAddressForPlatform(token.platforms, 'ethereum');
        return tokenAddress && !processedAddresses.has(tokenAddress.toLowerCase());
      });
      console.log(`Found ${tokensToProcess.length} tokens remaining to process`);
      
      if (tokensToProcess.length === 0) {
        console.log('All tokens have been processed!');
        // Generate final Excel report
        await generateExcelReport(existingData, timestamp);
        return;
      }
    } else {
      // Start from scratch - process all tokens
      tokensToProcess = topTokens;
      console.log(`Processing all ${tokensToProcess.length} tokens from scratch`);
    }
    
    // Process tokens
    for (let i = 0; i < tokensToProcess.length; i++) {
      const token = tokensToProcess[i];
      console.log(`\n[${i + 1}/${tokensToProcess.length}] Processing ${token.symbol} (Market Cap: $${token.market_cap.toLocaleString()})...`);
      
      const result = await analyzeTokenLiquidity(token);
      if (result) {
        existingData.push(result);
        console.log(`  ✓ Found liquidity data for ${token.symbol}`);
        
        // Save token data to JSON immediately after completion
        await saveTokenToJson(result, timestamp);
      } else {
        console.log(`  ✗ No liquidity data found for ${token.symbol}`);
      }
      
      // Add delay between tokens to avoid rate limits
      if (i < tokensToProcess.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`\nAnalysis complete! Total tokens processed: ${existingData.length}`);
    
    // Generate Excel report from all data
    await generateExcelReport(existingData, timestamp);
    
    // Print summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total tokens analyzed: ${existingData.length}`);
    
    const highScoreTokens = existingData.filter(r => r.lowLiquidityScore > 50);
    const mediumScoreTokens = existingData.filter(r => r.lowLiquidityScore > 20 && r.lowLiquidityScore <= 50);
    
    console.log(`High liquidity opportunity tokens (>50x ratio): ${highScoreTokens.length}`);
    console.log(`Medium liquidity opportunity tokens (20-50x ratio): ${mediumScoreTokens.length}`);
    
    if (highScoreTokens.length > 0) {
      console.log('\nTop 5 high-opportunity tokens:');
      highScoreTokens.slice(0, 5).forEach((token, index) => {
        console.log(`${index + 1}. ${token.tokenSymbol}: ${token.lowLiquidityScore.toFixed(2)}x ratio`);
      });
    }
    
  } catch (error) {
    console.error('Error running liquidity analysis:', error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Resume mode - JSON file provided
    const jsonFilePath = args[0];
    
    // If relative path, make it absolute
    const fullPath = path.isAbsolute(jsonFilePath) 
      ? jsonFilePath 
      : path.join(__dirname, jsonFilePath);
    
    await runLiquidityAnalysis(fullPath);
  } else {
    // Start from scratch mode
    await runLiquidityAnalysis();
  }
}

// Run the analysis
if (require.main === module) {
  main().catch(console.error);
}

export { runLiquidityAnalysis }; 