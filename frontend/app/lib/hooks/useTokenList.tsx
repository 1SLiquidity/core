import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TOKENS_TYPE } from './useWalletTokens'

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

// Function to format tokens to our app's structure
const formatCoingeckoTokens = (tokens: CoinGeckoToken[]): TOKENS_TYPE[] => {
  return tokens.map((token) => {
    // Get the token address from preferred platforms in order
    let tokenAddress = ''
    if (token.platforms) {
      tokenAddress =
        token.platforms['arbitrum-one'] ||
        token.platforms['ethereum'] ||
        token.platforms['polygon-pos'] ||
        token.platforms['binance-smart-chain'] ||
        ''
    }

    // Format the token data to match our app's token structure
    return {
      name: token.name,
      symbol: token.symbol.toUpperCase(),
      icon: token.image || `/tokens/${token.symbol.toLowerCase()}.svg`,
      popular: token.market_cap_rank ? token.market_cap_rank <= 100 : false,
      value: 0, // Default value, will be updated when wallet balance is available
      status: token.price_change_percentage_24h >= 0 ? 'increase' : 'decrease',
      statusAmount: Math.abs(token.price_change_percentage_24h || 0),
      token_address: tokenAddress.toLowerCase(),
      decimals: 18, // Default for most tokens
      balance: '0',
      possible_spam: false,
      usd_price: token.current_price || 0,
    }
  })
}

export const useTokenList = () => {
  // Use React Query to fetch and cache token data
  const {
    data: tokens = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['token-list'],
    queryFn: async () => {
      try {
        // Check if we have cached data in localStorage
        const cachedData = localStorage.getItem('tokenListCache')
        const cachedTimestamp = localStorage.getItem('tokenListCacheTimestamp')

        // If we have cached data and it's less than 24 hours old, use it
        if (cachedData && cachedTimestamp) {
          const cacheAge = Date.now() - parseInt(cachedTimestamp)
          if (cacheAge < 24 * 60 * 60 * 1000) {
            // 24 hours
            console.log('Using cached token list')
            return JSON.parse(cachedData)
          }
        }

        // Fetch top 250 tokens by market cap from CoinGecko API
        console.log('Fetching token list from CoinGecko API')
        const response = await fetch(
          'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&locale=en&precision=full'
        )

        if (!response.ok) {
          throw new Error('Failed to fetch token list')
        }

        const data: CoinGeckoToken[] = await response.json()

        // Fetch token platforms (addresses) for the tokens
        const platformsResponse = await fetch(
          'https://api.coingecko.com/api/v3/coins/list?include_platform=true'
        )

        if (!platformsResponse.ok) {
          throw new Error('Failed to fetch token platforms')
        }

        const platformsData = await platformsResponse.json()

        // Merge platforms data with token data
        const enrichedTokens = data.map((token) => {
          const platformInfo = platformsData.find((p: any) => p.id === token.id)
          return {
            ...token,
            platforms: platformInfo?.platforms || {},
          }
        })

        // Add missing top tokens
        const existingIds = enrichedTokens.map((t) => t.id)
        const missingTopTokens = topTokens.filter(
          (t) => !existingIds.includes(t.id)
        )

        // Combine and format tokens
        const allTokens = [...enrichedTokens, ...missingTopTokens]
        const formattedTokens = formatCoingeckoTokens(allTokens)

        // Cache the result in localStorage
        localStorage.setItem('tokenListCache', JSON.stringify(formattedTokens))
        localStorage.setItem('tokenListCacheTimestamp', Date.now().toString())

        return formattedTokens
      } catch (error) {
        console.error('Error fetching token list:', error)

        // If API fails, try to use cached data regardless of age
        const cachedData = localStorage.getItem('tokenListCache')
        if (cachedData) {
          console.log('API failed, using cached token list')
          return JSON.parse(cachedData)
        }

        // If no cached data, return default top tokens
        console.log('API failed, using default top tokens')
        return formatCoingeckoTokens(topTokens)
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
  }
}
