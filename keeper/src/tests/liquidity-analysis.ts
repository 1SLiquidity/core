import { createProvider } from '../utils/provider'
import { ReservesAggregator } from '../services/reserves-aggregator'
import { TokenService } from '../services/token-service'
import DatabaseService from '../services/database-service'
import * as dotenv from 'dotenv'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config()

// Create provider
const provider = createProvider()
const reservesAggregator = new ReservesAggregator(provider)
const tokenService = TokenService.getInstance(provider)

// Base tokens to test against (Ethereum addresses)
const BASE_TOKENS = {
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Ethereum WETH
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Ethereum USDT
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // Ethereum WBTC
}

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
}

// Function to check if a token is an ERC20 token
const NATIVE_TOKEN_ADDRESSES = [
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH (virtual)
  '0x0000000000000000000000000000000000000000', // ETH (native)
]

// Utility function to convert wei to normal value
function weiToNormal(weiValue: string | null, decimals: number): number {
  if (!weiValue || weiValue === '0') return 0
  try {
    const bigIntValue = BigInt(weiValue)
    const divisor = BigInt(10) ** BigInt(decimals)
    // Convert to number with proper decimal places
    return Number(bigIntValue) / Number(divisor)
  } catch (error) {
    console.warn(
      `Error converting wei value ${weiValue} with decimals ${decimals}:`,
      error
    )
    return 0
  }
}

// Function to calculate total reserves for a token across all DEXes
function calculateTotalReserves(
  reserves: any,
  isTokenA: boolean,
  decimals: number
): { weiTotal: string; normalTotal: number } {
  const reserveFields = isTokenA
    ? [
        'reservesAUniswapV2',
        'reservesASushiswap',
        'reservesAUniswapV3_500',
        'reservesAUniswapV3_3000',
        'reservesAUniswapV3_10000',
      ]
    : [
        'reservesBUniswapV2',
        'reservesBSushiswap',
        'reservesBUniswapV3_500',
        'reservesBUniswapV3_3000',
        'reservesBUniswapV3_10000',
      ]

  let totalWei = BigInt(0)

  reserveFields.forEach((field) => {
    const reserveValue = reserves[field]
    if (reserveValue && reserveValue !== '0') {
      try {
        totalWei += BigInt(reserveValue)
      } catch (error) {
        console.warn(
          `Error adding reserve value ${reserveValue} for field ${field}:`,
          error
        )
      }
    }
  })

  const weiTotalStr = totalWei.toString()
  const normalTotal = weiToNormal(weiTotalStr, decimals)

  return {
    weiTotal: weiTotalStr,
    normalTotal: normalTotal,
  }
}

// Improved function to check if a token is an ERC20 token on a specific platform
const isERC20Token = (
  tokenAddress: string,
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string
): boolean => {
  // No address or no platforms object means it's not a valid ERC20 token
  if (!tokenAddress || !platforms) {
    return false
  }

  // Check if the token has a valid address on the target platform
  const platformAddress = platforms[targetPlatform]
  if (!platformAddress) {
    return false
  }

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (tokenAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase() === 'bnb' ||
      platformAddress.toLowerCase().includes('binance'))
  ) {
    console.log(`BNB is not an ERC20 token on Ethereum: ${platformAddress}`)
    return false
  }

  // Native tokens (ETH) are not ERC20
  if (NATIVE_TOKEN_ADDRESSES.includes(platformAddress.toLowerCase())) {
    console.log(
      `Token address ${platformAddress} is a native token, not an ERC20`
    )
    return false
  }

  // Valid ERC20 tokens have a proper address format
  const isValid =
    platformAddress !== '' &&
    platformAddress !== '0x' &&
    platformAddress.startsWith('0x') &&
    platformAddress.length === 42

  if (!isValid) {
    console.log(
      `Token address ${platformAddress} is not a valid ERC20 address format`
    )
  }

  return isValid
}

// Function to safely get a token address from platforms object
const getTokenAddressForPlatform = (
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string
): string => {
  if (!platforms || !platforms[targetPlatform]) return ''

  const address = platforms[targetPlatform].toLowerCase()

  // Special handling for BNB which is not an ERC20 token on Ethereum
  if (
    targetPlatform === 'ethereum' &&
    (address === 'bnb' || address.includes('binance'))
  ) {
    console.log(`Excluded BNB token on Ethereum: ${address}`)
    return ''
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
    console.log(`Excluded token with invalid or native address: ${address}`)
    return ''
  }

  return address
}

interface TokenInfo {
  id: string
  symbol: string
  name: string
  market_cap_rank: number
  market_cap: number
  current_price: number
  platforms: {
    [key: string]: string
  }
}

interface LiquidityResult {
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  marketCap: number
  baseToken: string
  baseTokenSymbol: string
  dex: string
  reserves: {
    token0: string
    token1: string
  }
  decimals: {
    token0: number
    token1: number
  }
  timestamp: number
}

interface TokenLiquiditySummary {
  tokenAddress: string
  tokenSymbol: string
  tokenName: string
  marketCap: number
  liquidityPairs: LiquidityResult[]
}

async function fetchTopTokensByMarketCap(
  limit: number = 100
): Promise<TokenInfo[]> {
  console.log(
    `Fetching top ${limit} ERC20 tokens by market cap from CoinGecko...`
  )

  const tokens: TokenInfo[] = []
  const targetPlatform = 'ethereum' // Focus on Ethereum only

  try {
    // Fetch tokens by market cap from CoinGecko API
    console.log('Fetching tokens by market cap...')
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&locale=en&precision=full`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`)
    }

    const allTokens = (await response.json()) as TokenInfo[]
    console.log(`Successfully fetched ${allTokens.length} tokens`)

    // Fetch token platforms (addresses) for the tokens
    let platformsData = []
    try {
      const platformsResponse = await fetch(
        'https://api.coingecko.com/api/v3/coins/list?include_platform=true',
        {
          signal: AbortSignal.timeout(5000), // 5 second timeout
          headers: { Accept: 'application/json' },
        }
      )

      if (!platformsResponse.ok) {
        throw new Error(
          `Failed to fetch token platforms: ${platformsResponse.status}`
        )
      }

      platformsData = (await platformsResponse.json()) as any[]
      console.log(
        `Successfully fetched platform data for ${platformsData.length} tokens`
      )
    } catch (error) {
      console.error('Error fetching token platforms:', error)
      throw error
    }

    // Merge platforms data with token data
    const enrichedTokens = allTokens.map((token) => {
      const platformInfo = platformsData.find((p: any) => p.id === token.id)
      return {
        ...token,
        platforms: platformInfo?.platforms || {},
      }
    })

    // Filter for ERC20 tokens specifically with addresses on Ethereum
    const erc20Tokens = enrichedTokens.filter((token) => {
      const tokenAddress = getTokenAddressForPlatform(
        token.platforms,
        targetPlatform
      )
      // Use improved function to check if it's an ERC20 token on Ethereum
      return (
        tokenAddress &&
        isERC20Token(tokenAddress, token.platforms, targetPlatform)
      )
    })

    console.log(
      `Filtered ${
        enrichedTokens.length - erc20Tokens.length
      } non-ERC20 tokens out of ${enrichedTokens.length} total tokens`
    )

    console.log(
      `Found ${erc20Tokens.length} ERC20 tokens available on ${targetPlatform}`
    )

    return erc20Tokens.slice(0, limit)
  } catch (error) {
    console.error('Error fetching token list:', error)
    throw error
  }
}

async function getTokenAddressForChain(
  token: TokenInfo,
  chain: string = 'ethereum'
): Promise<string | null> {
  // Get token address from platforms
  const tokenAddress = getTokenAddressForPlatform(token.platforms, chain)

  if (!tokenAddress) {
    console.log(`No ${chain} address found for ${token.symbol}`)
    return null
  }

  // Check if it's a valid ERC20 token
  if (!isERC20Token(tokenAddress, token.platforms, chain)) {
    console.log(`${token.symbol} is not a valid ERC20 token on ${chain}`)
    return null
  }

  return tokenAddress.toLowerCase()
}

async function analyzeTokenLiquidity(
  token: TokenInfo
): Promise<TokenLiquiditySummary | null> {
  const tokenAddress = await getTokenAddressForChain(token, 'ethereum')
  if (!tokenAddress) {
    console.log(`No Ethereum address found for ${token.symbol}, skipping...`)
    return null
  }

  console.log(`\nAnalyzing liquidity for ${token.symbol} (${tokenAddress})...`)

  const liquidityPairs: LiquidityResult[] = []

  // Test against each base token
  for (const [baseSymbol, baseAddress] of Object.entries(BASE_TOKENS)) {
    console.log(`  Testing against ${baseSymbol}...`)

    try {
      // Get reserves from all DEXes for this token pair
      const allReserves = await getAllReservesForPair(
        tokenAddress,
        baseAddress,
        token.symbol,
        baseSymbol
      )

      if (allReserves.length > 0) {
        liquidityPairs.push(...allReserves)
        console.log(
          `    Found ${allReserves.length} DEX pools for ${token.symbol}/${baseSymbol}`
        )
      } else {
        console.log(`    No liquidity found for ${token.symbol}/${baseSymbol}`)
      }
    } catch (error) {
      console.warn(
        `    Error getting reserves for ${token.symbol}/${baseSymbol}:`,
        error
      )
    }

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  if (liquidityPairs.length === 0) {
    console.log(`  No liquidity found for ${token.symbol}`)
    return null
  }

  return {
    tokenAddress,
    tokenSymbol: token.symbol,
    tokenName: token.name,
    marketCap: token.market_cap,
    liquidityPairs,
  }
}

async function getAllReservesForPair(
  tokenA: string,
  tokenB: string,
  tokenSymbol: string,
  baseSymbol: string
): Promise<LiquidityResult[]> {
  const results: LiquidityResult[] = []

  // Get token decimals
  const [token0Info, token1Info] = await Promise.all([
    tokenService.getTokenInfo(tokenA),
    tokenService.getTokenInfo(tokenB),
  ])

  // Test each DEX individually
  const dexes = [
    { name: 'uniswap-v3-500', fee: 500 },
    { name: 'uniswap-v3-3000', fee: 3000 },
    { name: 'uniswap-v3-10000', fee: 10000 },
    { name: 'uniswapV2', fee: null },
    { name: 'sushiswap', fee: null },
  ]

  for (const dex of dexes) {
    try {
      let reserves
      if (dex.fee) {
        // Uniswap V3 with specific fee
        reserves = await reservesAggregator.getReservesFromDex(
          tokenA,
          tokenB,
          `uniswapV3_${dex.fee}` as any
        )
      } else {
        // Uniswap V2 or SushiSwap
        reserves = await reservesAggregator.getReservesFromDex(
          tokenA,
          tokenB,
          dex.name as any
        )
      }

      if (reserves) {
        const liquidityResult: LiquidityResult = {
          tokenAddress: tokenA,
          tokenSymbol: tokenSymbol,
          tokenName: tokenSymbol, // Using symbol as name for simplicity
          marketCap: 0, // Will be set by parent function
          baseToken: tokenB,
          baseTokenSymbol: baseSymbol,
          dex: dex.name,
          reserves: reserves.reserves,
          decimals: reserves.decimals,
          timestamp: reserves.timestamp,
        }

        results.push(liquidityResult)
        console.log(`      Found ${dex.name} liquidity`)
      }
    } catch (error) {
      console.warn(`      Error getting reserves from ${dex.name}:`, error)
    }

    // Small delay between DEX calls
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  return results
}

async function saveTokenToJson(
  tokenResult: TokenLiquiditySummary,
  timestamp: string
): Promise<void> {
  const jsonFilepath = path.join(
    __dirname,
    `liquidity-analysis-${timestamp}.json`
  )

  // Read existing data if file exists
  let existingData: TokenLiquiditySummary[] = []
  if (fs.existsSync(jsonFilepath)) {
    try {
      const fileContent = fs.readFileSync(jsonFilepath, 'utf8')
      existingData = JSON.parse(fileContent)
    } catch (error) {
      console.warn('Error reading existing JSON file, starting fresh:', error)
    }
  }

  // Add new token result (or update if it already exists)
  const existingIndex = existingData.findIndex(
    (item) => item.tokenAddress === tokenResult.tokenAddress
  )
  if (existingIndex >= 0) {
    existingData[existingIndex] = tokenResult
  } else {
    existingData.push(tokenResult)
  }

  // Save updated data
  fs.writeFileSync(jsonFilepath, JSON.stringify(existingData, null, 2))
  console.log(`  💾 Saved ${tokenResult.tokenSymbol} data to JSON`)
}

// Database saving function - transforms row-based data to column-based format with upsert functionality
async function saveToDatabase(
  results: TokenLiquiditySummary[],
  timestamp: string
): Promise<void> {
  console.log('\nSaving liquidity data to database...')

  const dbService = DatabaseService.getInstance()

  try {
    await dbService.connect()

    // Transform data from row-based (one row per DEX) to column-based (one row per token pair)
    const transformedData = transformToColumnFormat(results, timestamp)

    console.log(
      `📊 Transformed ${results.length} token summaries into ${transformedData.length} database records`
    )

    // Save data in batches with upsert functionality
    const batchSize = 50
    let saved = 0

    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize)

      console.log(
        `💾 Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          transformedData.length / batchSize
        )} (${batch.length} records)`
      )

      // Use upsert functionality to update existing records or create new ones
      await dbService.upsertBatchLiquidityData(batch)
      saved += batch.length

      // Small delay between batches
      if (i + batchSize < transformedData.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    console.log(
      `✅ Successfully upserted ${saved} liquidity records to database`
    )
  } catch (error) {
    console.error('❌ Error saving to database:', error)
    throw error
  } finally {
    await dbService.disconnect()
  }
}

// Transform the liquidity data from row-based format to column-based format for database
function transformToColumnFormat(
  results: TokenLiquiditySummary[],
  timestamp: string
): any[] {
  const transformedRecords: any[] = []

  // Group by token pair (tokenA + tokenB combination)
  const tokenPairMap = new Map<string, any>()

  results.forEach((tokenSummary) => {
    tokenSummary.liquidityPairs.forEach((pair) => {
      // Create a unique key for each token pair
      const pairKey = `${pair.tokenAddress}-${pair.baseToken}`

      if (!tokenPairMap.has(pairKey)) {
        // Initialize the record for this token pair
        tokenPairMap.set(pairKey, {
          timestamp: new Date(pair.timestamp),
          tokenAAddress: pair.tokenAddress,
          tokenASymbol: pair.tokenSymbol,
          tokenAName: pair.tokenName,
          tokenADecimals: pair.decimals.token0, // Assuming token0 is tokenA
          tokenBAddress: pair.baseToken,
          tokenBSymbol: pair.baseTokenSymbol,
          tokenBDecimals: pair.decimals.token1, // Assuming token1 is tokenB
          marketCap: BigInt(tokenSummary.marketCap),
          // Initialize all DEX reserves as null
          reservesAUniswapV2: null,
          reservesBUniswapV2: null,
          reservesASushiswap: null,
          reservesBSushiswap: null,
          reservesAUniswapV3_500: null,
          reservesBUniswapV3_500: null,
          reservesAUniswapV3_3000: null,
          reservesBUniswapV3_3000: null,
          reservesAUniswapV3_10000: null,
          reservesBUniswapV3_10000: null,
        })
      }

      const record = tokenPairMap.get(pairKey)!

      // Map DEX names to column names and set the reserves
      switch (pair.dex) {
        case 'uniswapV2':
          record.reservesAUniswapV2 = pair.reserves.token0
          record.reservesBUniswapV2 = pair.reserves.token1
          break
        case 'sushiswap':
          record.reservesASushiswap = pair.reserves.token0
          record.reservesBSushiswap = pair.reserves.token1
          break
        case 'uniswap-v3-500':
          record.reservesAUniswapV3_500 = pair.reserves.token0
          record.reservesBUniswapV3_500 = pair.reserves.token1
          break
        case 'uniswap-v3-3000':
          record.reservesAUniswapV3_3000 = pair.reserves.token0
          record.reservesBUniswapV3_3000 = pair.reserves.token1
          break
        case 'uniswap-v3-10000':
          record.reservesAUniswapV3_10000 = pair.reserves.token0
          record.reservesBUniswapV3_10000 = pair.reserves.token1
          break
        default:
          console.warn(`⚠️  Unknown DEX: ${pair.dex}`)
      }
    })
  })

  // Convert map to array and calculate total depths
  Array.from(tokenPairMap.values()).forEach((record) => {
    // Calculate total depth for token A
    const tokenATotals = calculateTotalReserves(
      record,
      true,
      record.tokenADecimals
    )
    record.reserveAtotaldepthWei = tokenATotals.weiTotal
    record.reserveAtotaldepth = tokenATotals.normalTotal

    // Calculate total depth for token B
    const tokenBTotals = calculateTotalReserves(
      record,
      false,
      record.tokenBDecimals
    )
    record.reserveBtotaldepthWei = tokenBTotals.weiTotal
    record.reserveBtotaldepth = tokenBTotals.normalTotal

    transformedRecords.push(record)
  })

  console.log(
    `📋 Grouped ${results.reduce(
      (sum, r) => sum + r.liquidityPairs.length,
      0
    )} individual DEX pairs into ${
      transformedRecords.length
    } token pair records with total depth calculations`
  )

  return transformedRecords
}

async function runLiquidityAnalysis(jsonFilePath?: string): Promise<void> {
  try {
    let existingData: TokenLiquiditySummary[] = []
    let timestamp: string
    let isResume = false

    if (jsonFilePath) {
      // Resume mode
      console.log(`Resuming liquidity analysis from: ${jsonFilePath}`)

      // Check if file exists
      if (!fs.existsSync(jsonFilePath)) {
        console.error(`File not found: ${jsonFilePath}`)
        return
      }

      // Load existing data
      const fileContent = fs.readFileSync(jsonFilePath, 'utf8')
      existingData = JSON.parse(fileContent)

      console.log(
        `Loaded ${existingData.length} existing tokens from JSON file`
      )

      // Extract timestamp from filename
      const filename = path.basename(jsonFilePath)
      const timestampMatch = filename.match(/liquidity-analysis-(.+)\.json/)
      if (!timestampMatch) {
        console.error('Could not extract timestamp from filename')
        return
      }
      timestamp = timestampMatch[1]
      isResume = true

      console.log(`Resuming with timestamp: ${timestamp}`)
    } else {
      // Start from scratch mode
      console.log(
        'Starting liquidity analysis for top ERC20 tokens on Ethereum...'
      )

      // Create timestamp for this run
      timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      console.log(`Using timestamp: ${timestamp}`)
    }

    // Get list of already processed token addresses (if resuming)
    const processedAddresses = new Set(
      existingData.map((item) => item.tokenAddress.toLowerCase())
    )
    if (isResume) {
      console.log(`Already processed ${processedAddresses.size} tokens`)
    }

    // Fetch top tokens
    const topTokens = await fetchTopTokensByMarketCap(250)
    console.log(`\nFetched ${topTokens.length} top ERC20 tokens`)

    if (topTokens.length === 0) {
      console.log('No ERC20 tokens found, exiting...')
      return
    }

    // Filter tokens based on mode
    let tokensToProcess: TokenInfo[]
    if (isResume) {
      // Filter out already processed tokens
      tokensToProcess = topTokens.filter((token) => {
        const tokenAddress = getTokenAddressForPlatform(
          token.platforms,
          'ethereum'
        )
        return (
          tokenAddress && !processedAddresses.has(tokenAddress.toLowerCase())
        )
      })
      console.log(`Found ${tokensToProcess.length} tokens remaining to process`)

      if (tokensToProcess.length === 0) {
        console.log('All tokens have been processed!')
        return
      }
    } else {
      // Start from scratch - process all tokens
      tokensToProcess = topTokens
      console.log(
        `Processing all ${tokensToProcess.length} tokens from scratch`
      )
    }

    const actualTokensToProcess = tokensToProcess.length
    // Process tokens
    for (let i = 0; i < actualTokensToProcess; i++) {
      const token = tokensToProcess[i]
      console.log(
        `\n[${i + 1}/${actualTokensToProcess}] Processing ${
          token.symbol
        } (Market Cap: $${token.market_cap.toLocaleString()})...`
      )

      const result = await analyzeTokenLiquidity(token)
      if (result) {
        existingData.push(result)
        console.log(`  ✓ Found liquidity data for ${token.symbol}`)

        // Save token data to JSON immediately after completion
        await saveTokenToJson(result, timestamp)
      } else {
        console.log(`  ✗ No liquidity data found for ${token.symbol}`)
      }

      // Add delay between tokens to avoid rate limits
      if (i < actualTokensToProcess - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(
      `\nAnalysis complete! Total tokens processed: ${existingData.length}`
    )

    // Save data to database
    if (process.env.DATABASE_URL) {
      try {
        await saveToDatabase(existingData, timestamp)
      } catch (error) {
        console.error(
          '⚠️  Failed to save to database, but analysis completed:',
          error
        )
        // Don't throw error to avoid failing the entire analysis
      }
    } else {
      console.log('💡 DATABASE_URL not configured, skipping database save')
    }

    // Print summary
    console.log('\n=== SUMMARY ===')
    console.log(`Total tokens analyzed: ${existingData.length}`)

    const totalPairs = existingData.reduce(
      (sum, token) => sum + token.liquidityPairs.length,
      0
    )
    console.log(`Total DEX pairs found: ${totalPairs}`)

    // Count by DEX
    const dexCounts: Record<string, number> = {}
    existingData.forEach((token) => {
      token.liquidityPairs.forEach((pair) => {
        dexCounts[pair.dex] = (dexCounts[pair.dex] || 0) + 1
      })
    })

    console.log('\nPairs by DEX:')
    Object.entries(dexCounts).forEach(([dex, count]) => {
      console.log(`  ${dex}: ${count} pairs`)
    })
  } catch (error) {
    console.error('Error running liquidity analysis:', error)
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2)

  if (args.length > 0) {
    // Resume mode - JSON file provided
    const jsonFilePath = args[0]

    // If relative path, make it absolute
    const fullPath = path.isAbsolute(jsonFilePath)
      ? jsonFilePath
      : path.join(__dirname, jsonFilePath)

    await runLiquidityAnalysis(fullPath)
  } else {
    // Start from scratch mode
    await runLiquidityAnalysis()
  }
}

// Run the analysis
if (require.main === module) {
  main().catch(console.error)
}

export { runLiquidityAnalysis }
