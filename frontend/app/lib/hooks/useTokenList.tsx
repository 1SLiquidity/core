import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TOKENS_TYPE } from './useWalletTokens'
import { useAppKitState } from '@reown/appkit/react'

// Type for CoinGecko token response
interface CoinGeckoToken {
  id: string
  symbol: string
  name: string
  platforms?: {
    [key: string]: string
  }
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap_rank?: number
}

// Mapping from chain IDs to CoinGecko platform identifiers
const CHAIN_ID_TO_PLATFORM: Record<string, string> = {
  '1': 'ethereum',
  '42161': 'arbitrum-one',
  '137': 'polygon-pos',
  '56': 'binance-smart-chain',
  // Add more chains as needed
}

// Add top tokens that might not be captured in the API
const topTokens = [
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    platforms: {
      ethereum: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      'arbitrum-one': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    },
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap_rank: 2,
  },
  {
    id: 'weth',
    symbol: 'weth',
    name: 'Wrapped Ethereum',
    platforms: {
      ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      'arbitrum-one': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    },
    image: 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
    current_price: 0,
    price_change_percentage_24h: 0,
    market_cap_rank: 3,
  },
  {
    id: 'tether',
    symbol: 'usdt',
    name: 'Tether',
    platforms: {
      ethereum: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      'arbitrum-one': '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    },
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    current_price: 1,
    price_change_percentage_24h: 0,
    market_cap_rank: 1,
  },
  {
    id: 'usd-coin',
    symbol: 'usdc',
    name: 'USD Coin',
    platforms: {
      ethereum: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      'arbitrum-one': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    },
    image:
      'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    current_price: 1,
    price_change_percentage_24h: 0,
    market_cap_rank: 4,
  },
]

// Function to safely get a token address from platforms object
const getTokenAddressForPlatform = (
  platforms: { [key: string]: string } | undefined,
  targetPlatform: string
): string => {
  if (!platforms) return ''

  // TypeScript now understands platforms is an object with string keys and string values
  return platforms[targetPlatform] || ''
}

// Function to format tokens to our app's structure
const formatCoingeckoTokens = (
  tokens: CoinGeckoToken[],
  targetPlatform: string
): TOKENS_TYPE[] => {
  return tokens
    .map((token) => {
      // Get the token address for the specific platform/chain
      let tokenAddress = getTokenAddressForPlatform(
        token.platforms,
        targetPlatform
      )

      // If not found on target platform, check for ethereum as fallback
      if (!tokenAddress && targetPlatform !== 'ethereum') {
        tokenAddress = getTokenAddressForPlatform(token.platforms, 'ethereum')
      }

      // Skip tokens that don't have an address on the target platform
      if (!tokenAddress) {
        return null
      }

      // Format the token data to match our app's token structure
      return {
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        icon: token.image || `/tokens/${token.symbol.toLowerCase()}.svg`,
        popular: token.market_cap_rank ? token.market_cap_rank <= 100 : false,
        value: 0, // Default value, will be updated when wallet balance is available
        status:
          token.price_change_percentage_24h >= 0 ? 'increase' : 'decrease',
        statusAmount: Math.abs(token.price_change_percentage_24h || 0),
        token_address: tokenAddress.toLowerCase(),
        decimals: 18, // Default for most tokens
        balance: '0',
        possible_spam: false,
        usd_price: token.current_price || 0,
      }
    })
    .filter(Boolean) as TOKENS_TYPE[] // Filter out null values
}

// Helper function to check if a token has an address on a specific platform
const tokenHasAddressOnPlatform = (
  token: CoinGeckoToken,
  platform: string
): boolean => {
  return !!(token.platforms && token.platforms[platform])
}

// Configuration for token fetching
const TOKEN_CONFIG = {
  PAGES_TO_FETCH: 4, // Fetch 4 pages (1000 tokens total with 250 per page)
  TOKENS_PER_PAGE: 250, // Maximum allowed by CoinGecko API
}

export const useTokenList = () => {
  // Get the current chain from AppKit
  const stateData = useAppKitState()
  const chainId = stateData?.selectedNetworkId?.split(':')[1] || '1' // Default to Ethereum if not available

  // Get the corresponding platform identifier for CoinGecko API
  const targetPlatform = CHAIN_ID_TO_PLATFORM[chainId] || 'ethereum'

  // Use the chain ID in the cache key to separate caches for different chains
  const cacheKey = `tokenListCache_${chainId}`
  const cacheTimestampKey = `tokenListCacheTimestamp_${chainId}`

  // Use React Query to fetch and cache token data
  const {
    data: tokens = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['token-list', chainId],
    queryFn: async () => {
      try {
        // Check if we have cached data in localStorage for this specific chain
        const cachedData = localStorage.getItem(cacheKey)
        const cachedTimestamp = localStorage.getItem(cacheTimestampKey)

        // If we have cached data and it's less than 24 hours old, use it
        if (cachedData && cachedTimestamp) {
          const cacheAge = Date.now() - parseInt(cachedTimestamp)
          if (cacheAge < 24 * 60 * 60 * 1000) {
            // 24 hours
            console.log(`Using cached token list for chain ${chainId}`)
            return JSON.parse(cachedData)
          }
        }

        // Fetch multiple pages of tokens by market cap from CoinGecko API
        console.log(
          `Fetching ${TOKEN_CONFIG.PAGES_TO_FETCH} pages of tokens from CoinGecko API for chain ${chainId} (${targetPlatform})`
        )

        let allTokens: CoinGeckoToken[] = []

        // Fetch tokens page by page
        for (let page = 1; page <= TOKEN_CONFIG.PAGES_TO_FETCH; page++) {
          try {
            console.log(`Fetching page ${page} of tokens...`)
            const response = await fetch(
              `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${TOKEN_CONFIG.TOKENS_PER_PAGE}&page=${page}&sparkline=false&locale=en&precision=full`
            )

            if (!response.ok) {
              console.warn(`Failed to fetch page ${page}, stopping pagination`)
              break
            }

            const pageData: CoinGeckoToken[] = await response.json()
            allTokens = [...allTokens, ...pageData]

            // CoinGecko has rate limits, so add a small delay between requests
            if (page < TOKEN_CONFIG.PAGES_TO_FETCH) {
              await new Promise((resolve) => setTimeout(resolve, 1100)) // 1.1 second delay to avoid rate limits
            }
          } catch (error) {
            console.error(`Error fetching page ${page}:`, error)
            break // Stop pagination on error
          }
        }

        console.log(`Successfully fetched ${allTokens.length} tokens`)

        // Fetch token platforms (addresses) for the tokens
        const platformsResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
        )

        if (!platformsResponse.ok) {
          throw new Error('Failed to fetch token platforms')
        }

        const platformsData = await platformsResponse.json()

        // Merge platforms data with token data
        const enrichedTokens = allTokens.map((token) => {
          const platformInfo = platformsData.find((p: any) => p.id === token.id)
          return {
            ...token,
            platforms: platformInfo?.platforms || {},
          }
        })

        // Filter for tokens specifically with addresses on the target platform
        const platformFilteredTokens = enrichedTokens.filter((token) =>
          tokenHasAddressOnPlatform(token, targetPlatform)
        )

        console.log(
          `Found ${platformFilteredTokens.length} tokens available on ${targetPlatform}`
        )

        // Add missing top tokens (only if they have an address for the current chain)
        const existingIds = platformFilteredTokens.map((t) => t.id)
        const missingTopTokens = topTokens.filter(
          (t) =>
            !existingIds.includes(t.id) &&
            tokenHasAddressOnPlatform(t, targetPlatform)
        )

        // Combine and format tokens, filtering for those with addresses on the selected chain
        const combinedTokens = [...platformFilteredTokens, ...missingTopTokens]
        const formattedTokens = formatCoingeckoTokens(
          combinedTokens,
          targetPlatform
        )

        console.log(
          `Formatted ${formattedTokens.length} tokens for ${targetPlatform}`
        )

        // Cache the result in localStorage for this specific chain
        localStorage.setItem(cacheKey, JSON.stringify(formattedTokens))
        localStorage.setItem(cacheTimestampKey, Date.now().toString())

        return formattedTokens
      } catch (error) {
        console.error('Error fetching token list:', error)

        // If API fails, try to use cached data regardless of age
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          console.log(
            `API failed, using cached token list for chain ${chainId}`
          )
          return JSON.parse(cachedData)
        }

        // If no cached data, return default top tokens for the current chain
        console.log(`API failed, using default top tokens for chain ${chainId}`)
        const chainTopTokens = topTokens.filter((t) =>
          tokenHasAddressOnPlatform(t, targetPlatform)
        )
        return formatCoingeckoTokens(chainTopTokens, targetPlatform)
      }
    },
    staleTime: 1000 * 60 * 60 * 12, // Cache for 12 hours
    gcTime: 1000 * 60 * 60 * 24, // Keep in garbage collection for 24 hours
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  })

  return {
    tokens,
    isLoading,
    error,
    refetch,
    chainId,
    platform: targetPlatform,
  }
}
