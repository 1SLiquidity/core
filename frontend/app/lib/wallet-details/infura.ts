'use client'

import { ethers } from 'ethers'

// Types for the JSON structure (unchanged)
interface TokenResult {
  tokenName: string
  tokenAddress: string
  tokenDecimals: number
  tokenSymbol: string
  success: boolean
  failureReason: string
}

interface TestResult {
  baseToken: string
  totalTests: number
  successCount: number
  failureCount: number
  results: TokenResult[]
}

interface TokensListData {
  timestamp: string
  testResults: TestResult[]
}

// ERC-20 Token ABI (minimal required functions)
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
]

// Infura provider for Ethereum mainnet
let infuraProvider: ethers.providers.JsonRpcProvider | null = null

// Initialize Infura provider for Ethereum mainnet
export const initInfura = (): ethers.providers.JsonRpcProvider => {
  if (infuraProvider) {
    return infuraProvider
  }

  const providerUrl = `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`
  infuraProvider = new ethers.providers.JsonRpcProvider(providerUrl)
  return infuraProvider
}

/**
 * Load whitelisted token addresses from the JSON file (unchanged)
 * @returns Array of lowercase token addresses that have success: true
 */
const getWhitelistedTokens = (): string[] => {
  try {
    // Dynamically require the JSON file
    const tokensListData: TokensListData = require('./utils/tokens-list-04-09-2025.json')
    const whitelistedTokens: string[] = []

    // Iterate through all test results
    tokensListData.testResults.forEach((testResult: TestResult) => {
      testResult.results.forEach((token: TokenResult) => {
        // Only include tokens that have success: true
        if (token.success === true && token.tokenAddress) {
          // Convert to lowercase for consistent comparison
          const address = token.tokenAddress.toLowerCase()
          // Avoid duplicates
          if (!whitelistedTokens.includes(address)) {
            whitelistedTokens.push(address)
          }
        }
      })
    })

    console.log(
      `🔍 DEBUG: Loaded ${whitelistedTokens.length} whitelisted tokens from JSON file`
    )
    return whitelistedTokens
  } catch (error) {
    console.error('💥 Error loading whitelisted tokens from JSON:', error)
    // Fallback to basic tokens if JSON loading fails
    return [
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT on Ethereum mainnet
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC on Ethereum mainnet
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
    ]
  }
}

// Popular Ethereum tokens to check for balances
const POPULAR_ETH_TOKENS = [
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
  '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', // MATIC
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', // SHIB
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b', // CRO
  '0x4fabb145d64652a948d72533023f6e7a623c7c53', // BUSD
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // stETH
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
  '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72', // ENS
  '0x6982508145454ce325ddbe47a25d4ec3d2311933', // PEPE
]

export interface TokenData {
  token_address: string
  name: string
  symbol: string
  logo?: string
  thumbnail?: string
  decimals: number
  balance: string
  possible_spam: boolean
  verified_collection?: boolean
  value?: number
  status: 'increase' | 'decrease'
  statusAmount: number
  usd_price: number
  usdPrice24hrPercentChange?: number
}

interface CoinGeckoPriceResponse {
  [address: string]: {
    usd: number
    usd_24h_change: number
  }
}

interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    usd: number
    usd_24h_change: number
  }
}

/**
 * Cache configuration (unchanged)
 */
const CACHE_CONFIG = {
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
}

/**
 * Get cached data with TTL check (unchanged)
 */
const getCachedWalletData = (
  cacheKey: string,
  timestampKey: string,
  duration: number
) => {
  try {
    if (typeof window === 'undefined') return null // SSR safety

    const cachedData = localStorage.getItem(cacheKey)
    const cachedTimestamp = localStorage.getItem(timestampKey)

    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp)
      if (cacheAge < duration) {
        return JSON.parse(cachedData)
      }
    }
    return null
  } catch (error) {
    console.error('Error reading cached wallet data:', error)
    return null
  }
}

/**
 * Set cached data with timestamp (unchanged)
 */
const setCachedWalletData = (
  cacheKey: string,
  timestampKey: string,
  data: any
) => {
  try {
    if (typeof window === 'undefined') return // SSR safety

    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(timestampKey, Date.now().toString())
  } catch (error) {
    console.error('Error setting cached wallet data:', error)
  }
}

/**
 * Get token metadata using Infura
 */
const getTokenMetadata = async (
  tokenAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<{ name: string; symbol: string; decimals: number }> => {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    const [name, symbol, decimals] = await Promise.all([
      contract.name().catch(() => 'Unknown Token'),
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.decimals().catch(() => 18),
    ])

    return {
      name: name || 'Unknown Token',
      symbol: symbol || 'UNKNOWN',
      decimals: Number(decimals) || 18,
    }
  } catch (error) {
    console.warn(`Error fetching metadata for ${tokenAddress}:`, error)
    return {
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
    }
  }
}

/**
 * Get token balance using Infura
 */
const getTokenBalance = async (
  tokenAddress: string,
  walletAddress: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<string> => {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
    const balance = await contract.balanceOf(walletAddress)
    return balance.toString()
  } catch (error) {
    console.warn(`Error fetching balance for ${tokenAddress}:`, error)
    return '0'
  }
}

/**
 * Fetch token prices from CoinGecko using contract addresses
 */
const getTokenPricesFromCoinGecko = async (
  tokenAddresses: string[]
): Promise<{
  [address: string]: { usd_price: number; percent_change_24h: number }
}> => {
  try {
    if (tokenAddresses.length === 0) return {}

    // CoinGecko API endpoint for Ethereum token prices
    const addressesParam = tokenAddresses.join(',')
    const url = `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressesParam}&vs_currencies=usd&include_24hr_change=true`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      )
    }

    const data: CoinGeckoPriceResponse = await response.json()

    // Transform the response to match our expected format
    const result: {
      [address: string]: { usd_price: number; percent_change_24h: number }
    } = {}

    Object.entries(data).forEach(([address, priceData]) => {
      result[address.toLowerCase()] = {
        usd_price: priceData.usd || 0,
        percent_change_24h: priceData.usd_24h_change || 0,
      }
    })

    return result
  } catch (error) {
    console.error('Error fetching token prices from CoinGecko:', error)
    return {}
  }
}

/**
 * Fetch ETH price from CoinGecko
 */
const getEthPriceFromCoinGecko = async (): Promise<{
  usd_price: number
  percent_change_24h: number
}> => {
  try {
    const url =
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true'

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(
        `CoinGecko API error: ${response.status} ${response.statusText}`
      )
    }

    const data: CoinGeckoSimplePriceResponse = await response.json()

    if (data.ethereum) {
      return {
        usd_price: data.ethereum.usd || 0,
        percent_change_24h: data.ethereum.usd_24h_change || 0,
      }
    }

    return { usd_price: 0, percent_change_24h: 0 }
  } catch (error) {
    console.error('Error fetching ETH price:', error)
    return { usd_price: 0, percent_change_24h: 0 }
  }
}

/**
 * Fetch tokens for a wallet address using Infura + CoinGecko (Ethereum only)
 * @param address Wallet address
 * @param chain Chain parameter (kept for compatibility, but only 'eth' is supported)
 * @returns Array of token data
 */
export const getWalletTokens = async (
  address: string,
  chain: string = 'eth'
): Promise<TokenData[]> => {
  try {
    // Create cache keys for this specific address
    const cacheKey = `wallet_tokens_${address.toLowerCase()}_eth`
    const timestampKey = `wallet_tokens_timestamp_${address.toLowerCase()}_eth`

    // Check for cached data first
    const cachedTokens = getCachedWalletData(
      cacheKey,
      timestampKey,
      CACHE_CONFIG.CACHE_DURATION
    )

    if (cachedTokens) {
      console.log(
        `🔍 DEBUG: Using cached wallet tokens for ${address} on Ethereum`
      )
      return cachedTokens
    }

    console.log(
      `🔍 DEBUG: Fetching fresh wallet tokens for ${address} on Ethereum`
    )

    const provider = initInfura()

    // Get ETH balance
    const ethBalance = await provider.getBalance(address)

    // Get all tokens to check (popular tokens + whitelisted tokens)
    const whitelistedTokens = getWhitelistedTokens()
    const allTokensToCheck = [
      ...new Set([...POPULAR_ETH_TOKENS, ...whitelistedTokens]),
    ]

    console.log(
      `🔍 DEBUG: Checking ${allTokensToCheck.length} tokens for balances`
    )

    // Check balances for all tokens in parallel
    const tokenBalancePromises = allTokensToCheck.map(async (tokenAddress) => {
      try {
        const balance = await getTokenBalance(tokenAddress, address, provider)
        return { tokenAddress, balance }
      } catch (error) {
        console.warn(`Error checking balance for ${tokenAddress}:`, error)
        return { tokenAddress, balance: '0' }
      }
    })

    const tokenBalanceResults = await Promise.all(tokenBalancePromises)

    // Filter out tokens with zero balances
    const tokensWithBalance = tokenBalanceResults.filter(
      (result) => result.balance !== '0' && result.balance !== '0x0'
    )

    console.log(
      `📊 Found ${tokensWithBalance.length} tokens with non-zero balances`
    )

    // Get metadata for tokens with balances
    const tokenMetadataPromises = tokensWithBalance.map(
      async ({ tokenAddress, balance }) => {
        const metadata = await getTokenMetadata(tokenAddress, provider)
        return {
          tokenAddress,
          balance,
          ...metadata,
        }
      }
    )

    const tokensWithMetadata = await Promise.all(tokenMetadataPromises)

    // Get token addresses for price fetching
    const tokenAddressesForPricing = tokensWithMetadata.map(
      (token) => token.tokenAddress
    )

    // Get token prices from CoinGecko
    let tokenPrices: {
      [address: string]: { usd_price: number; percent_change_24h: number }
    } = {}
    if (tokenAddressesForPricing.length > 0) {
      tokenPrices = await getTokenPricesFromCoinGecko(tokenAddressesForPricing)
    }

    // Get ETH price
    const ethPrice = await getEthPriceFromCoinGecko()

    // Create ETH token data
    const ethTokenData: TokenData = {
      token_address: '0x0000000000000000000000000000000000000000',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      balance: ethBalance.toString(),
      possible_spam: false,
      usd_price: ethPrice.usd_price,
      status: ethPrice.percent_change_24h >= 0 ? 'increase' : 'decrease',
      statusAmount: Math.abs(ethPrice.percent_change_24h),
    }

    // Process ERC-20 tokens with metadata and prices
    let tokensWithPrices = tokensWithMetadata.map((token) => {
      const priceData = tokenPrices[token.tokenAddress.toLowerCase()] || {
        usd_price: 0,
        percent_change_24h: 0,
      }

      return {
        token_address: token.tokenAddress,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        balance: token.balance,
        possible_spam: false, // We'll filter manually
        usd_price: priceData.usd_price,
        status:
          priceData.percent_change_24h >= 0
            ? ('increase' as const)
            : ('decrease' as const),
        statusAmount: Math.abs(priceData.percent_change_24h),
      }
    })

    // Add ETH to the beginning of the array
    tokensWithPrices = [ethTokenData, ...tokensWithPrices]

    // Apply the same filtering logic as before
    const validTokens = tokensWithPrices.filter((token) => {
      // Blacklist - tokens to always exclude
      const blacklistedTokens = [
        '0xfaf87e196a29969094be35dfb0ab9d0b8518db84', // ACHIVX
        '0xca51cf6867c156347fcc63531fb18e808f427e12', // $3800
        '0xbac4cb8e7dd60f868cbc14b21a6dc249177d8bbe', // pepe
        '0x95e8799b6c3c7942e321ff95ee0a656fefe20bda', // UNI
        '0x8328ac89bffb92c928f0d60aecc593b801ed4c0b', // ETH-Tokens.us
      ]

      // Always exclude blacklisted tokens
      if (blacklistedTokens.includes(token.token_address.toLowerCase())) {
        return false
      }

      // Whitelist - tokens to always include regardless of other filters
      const whitelistedTokens = getWhitelistedTokens()

      // Always include whitelisted tokens
      if (whitelistedTokens.includes(token.token_address.toLowerCase())) {
        return true
      }

      // Skip tokens with suspicious names or symbols that contain URLs or common spam patterns
      const suspiciousPatterns = [
        'visit',
        'swap',
        'claim',
        'airdrop',
        'http',
        '.xyz',
        '.pro',
        '.io',
        '.us',
        'get',
        'free',
        'bonus',
        'win',
        'lucky',
        'prize',
        'giveaway',
      ]

      const symbolLower = (token.symbol || '').toLowerCase()
      const nameLower = (token.name || '').toLowerCase()

      const hasSpamPattern = suspiciousPatterns.some(
        (pattern) =>
          symbolLower.includes(pattern.toLowerCase()) ||
          nameLower.includes(pattern.toLowerCase())
      )

      if (hasSpamPattern) {
        console.log(
          '🚫 DEBUG: Token has spam pattern:',
          token.symbol,
          token.name,
          token.token_address
        )
        return false
      }

      // Keep tokens with price data or ETH or tokens with actual balance that passed spam checks
      const hasPrice = token.usd_price > 0
      const isEth =
        token.token_address === '0x0000000000000000000000000000000000000000'
      const hasBalance = parseFloat(token.balance) > 0

      const shouldInclude = hasPrice || isEth || hasBalance

      console.log('🔍 DEBUG: Token filter result:', {
        symbol: token.symbol,
        address: token.token_address,
        hasPrice,
        isEth,
        hasBalance,
        shouldInclude,
        usd_price: token.usd_price,
        balance: token.balance,
      })

      return shouldInclude
    })

    console.log('📈 DEBUG: Total tokens after filtering:', validTokens.length)
    console.log(
      '📈 DEBUG: Valid tokens:',
      validTokens.map((t) => ({
        symbol: t.symbol,
        address: t.token_address,
        price: t.usd_price,
      }))
    )

    // Cache the result before returning
    setCachedWalletData(cacheKey, timestampKey, validTokens)

    return validTokens
  } catch (error: any) {
    console.error('💥 Error fetching wallet tokens:', error)
    console.error('💥 Error details:', {
      message: error?.message,
      code: error?.code,
      response: error?.response?.data,
    })
    return []
  }
}

/**
 * Calculate the total wallet balance in USD (unchanged)
 * @param tokens Array of token data
 * @returns Total wallet balance in USD
 */
export const calculateWalletBalance = (tokens: TokenData[]): number => {
  return tokens.reduce((total, token) => {
    const tokenBalance = parseFloat(token.balance) / 10 ** token.decimals
    const tokenValue = tokenBalance * (token.usd_price || 0)
    return total + tokenValue
  }, 0)
}

/**
 * Format tokens data to match the app's token format (unchanged)
 * @param tokens Array of token data
 * @returns Formatted token data matching the app's TOKENS_TYPE structure
 */
export const formatTokensData = (tokens: TokenData[]) => {
  return tokens.map((token) => {
    // Calculate token value in native units
    const tokenValue = parseFloat(token.balance) / 10 ** token.decimals

    return {
      name: token.name || 'Unknown Token',
      symbol: token.symbol || 'UNKNOWN',
      icon:
        token.thumbnail ||
        token.logo ||
        `/tokens/${token.symbol?.toLowerCase()}.svg`,
      popular: false, // Default value, you may want to customize this based on your app logic
      value: tokenValue, // Value in native token units (e.g., ETH, not USD)
      status: token.status || 'increase', // Use token status from price data or default
      statusAmount: token.statusAmount || 0, // Use status amount from price data or default
      token_address: token.token_address,
      decimals: token.decimals,
      balance: token.balance,
      possible_spam: token.possible_spam,
      usd_price: token.usd_price || 0,
    }
  })
}

// Legacy exports for backward compatibility
export const initMoralis = async () => {
  console.log('⚠️  initMoralis called but using Infura now')
}

export const CHAIN_MAPPING = {
  eth: 'ethereum',
  ethereum: 'ethereum',
}
