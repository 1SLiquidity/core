import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TOKENS_TYPE } from './useWalletTokens'
import { useAppKitState } from '@reown/appkit/react'

// Update the CoinGeckoToken interface to better match our needs
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
  detail_platforms?: {
    [key: string]: {
      decimal_place?: number
      contract_address: string
    }
  }
}

// Add a type for our essential tokens
interface EssentialToken {
  id: string
  symbol: string
  name: string
  platforms: {
    [key: string]: string
  }
  image: string
  current_price: number
  price_change_percentage_24h: number
  market_cap_rank: number
  detail_platforms: {
    [key: string]: {
      decimal_place: number
      contract_address: string
    }
  }
}

// Mapping from chain IDs to CoinGecko platform identifiers
const CHAIN_ID_TO_PLATFORM: Record<string, string> = {
  '1': 'ethereum',
  '42161': 'arbitrum-one',
  '137': 'polygon-pos',
  '56': 'binance-smart-chain',
  // Add more chains as needed
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

  // Arbitrum
  '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 6, // USDT on Arbitrum
  '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 6, // USDC on Arbitrum
  '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 18, // WETH on Arbitrum
  '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 8, // WBTC on Arbitrum
}

// Function to check if a token is an ERC20 token
const NATIVE_TOKEN_ADDRESSES = [
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH (virtual)
  '0x0000000000000000000000000000000000000000', // ETH (native)
]

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

// Function to get token decimals from detail_platforms object
const getTokenDecimalsForPlatform = (
  detailPlatforms:
    | { [key: string]: { decimal_place?: number; contract_address: string } }
    | undefined,
  targetPlatform: string
): number => {
  if (!detailPlatforms || !detailPlatforms[targetPlatform]) return 18 // Default to 18 if not found

  const decimalPlace = detailPlatforms[targetPlatform].decimal_place
  console.log(
    `Found decimal place from API: ${decimalPlace} for platform ${targetPlatform}`
  )
  return decimalPlace || 18
}

// Function to get token decimals based on symbol, with fallback to address
const getTokenDecimalsBySymbolOrAddress = (
  symbol: string,
  address: string
): number => {
  // First try by address (most reliable)
  const lowerCaseAddress = address.toLowerCase()
  if (KNOWN_TOKEN_DECIMALS[lowerCaseAddress]) {
    console.log(
      `Found decimals by address for ${symbol}: ${KNOWN_TOKEN_DECIMALS[lowerCaseAddress]}`
    )
    return KNOWN_TOKEN_DECIMALS[lowerCaseAddress]
  }

  // Then try by symbol (less reliable but good fallback)
  const lowerCaseSymbol = symbol.toLowerCase()

  // Common ERC20 tokens
  if (lowerCaseSymbol === 'usdt') return 6
  if (lowerCaseSymbol === 'usdc') return 6
  if (lowerCaseSymbol === 'wbtc') return 8
  if (lowerCaseSymbol === 'btc') return 8
  if (lowerCaseSymbol === 'dai') return 18
  if (lowerCaseSymbol === 'weth') return 18
  if (lowerCaseSymbol === 'eth') return 18

  // Default to 18 if not found
  return 18
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

      // Skip tokens that don't have an address on the target platform
      if (!tokenAddress) {
        return null
      }

      // Skip non-ERC20 tokens using improved function
      if (!isERC20Token(tokenAddress, token.platforms, targetPlatform)) {
        console.log(
          `Skipping non-ERC20 token: ${token.symbol} (${tokenAddress}) on platform ${targetPlatform}`
        )
        return null
      }

      // Get token decimals from detail_platforms if available
      let decimals = getTokenDecimalsForPlatform(
        token.detail_platforms,
        targetPlatform
      )

      // Apply known token decimals override - this takes precedence over API data
      const knownDecimals = getTokenDecimalsBySymbolOrAddress(
        token.symbol,
        tokenAddress
      )

      if (decimals !== knownDecimals) {
        decimals = knownDecimals
      }

      // Determine if token is popular based on market cap rank and symbol
      const isPopularToken =
        token.symbol.toLowerCase() === 'weth' ||
        token.symbol.toLowerCase() === 'wbtc' ||
        token.symbol.toLowerCase() === 'usdt' ||
        token.symbol.toLowerCase() === 'usdc' ||
        token.symbol.toLowerCase() === 'dai' ||
        (token.market_cap_rank && token.market_cap_rank <= 15) // Increased priority for top 15 tokens

      console.log('market_cap_rank ===================>', token.market_cap_rank)
      // Format the token data to match our app's token structure
      return {
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        icon: token.image || `/tokens/${token.symbol.toLowerCase()}.svg`,
        popular: isPopularToken,
        value: 0, // Default value, will be updated when wallet balance is available
        status:
          token.price_change_percentage_24h >= 0 ? 'increase' : 'decrease',
        statusAmount: Math.abs(token.price_change_percentage_24h || 0),
        token_address: tokenAddress.toLowerCase(),
        decimals: decimals,
        balance: '0',
        possible_spam: false,
        usd_price: token.current_price || 0,
        market_cap_rank: token.market_cap_rank || 999999, // Add market cap rank for sorting
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

// Update the configuration for token fetching
const TOKEN_CONFIG = {
  PAGES_TO_FETCH: 2, // Reduce from 4 to 2 pages to avoid rate limits
  TOKENS_PER_PAGE: 250, // Maximum allowed by CoinGecko API
  CACHE_DURATION: 2 * 60 * 60 * 1000, // 2 hours in milliseconds
  RETRY_DELAY: 2000, // 2 seconds delay between retries
  // staleTime: 1000 * 60 * 60 * 12, // Cache for 12 hours
  // CACHE_DURATION: 1000 * 60 * 60 * 24, // Keep in garbage collection for 24 hours
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

// Add more essential tokens to our default list
const topTokens: EssentialToken[] = [
  // Removing ETH as it's not an ERC20 token
  {
    id: 'weth',
    symbol: 'weth',
    name: 'Wrapped Ethereum',
    platforms: {
      ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      'arbitrum-one': '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    },
    image: 'https://assets.coingecko.com/coins/images/2518/large/weth.png',
    current_price: 2800,
    price_change_percentage_24h: 0,
    market_cap_rank: 1,
    detail_platforms: {
      ethereum: {
        decimal_place: 18,
        contract_address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      },
      'arbitrum-one': {
        decimal_place: 18,
        contract_address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
      },
    },
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
    market_cap_rank: 2,
    detail_platforms: {
      ethereum: {
        decimal_place: 6,
        contract_address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      },
      'arbitrum-one': {
        decimal_place: 6,
        contract_address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      },
    },
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
    market_cap_rank: 3,
    detail_platforms: {
      ethereum: {
        decimal_place: 6,
        contract_address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      },
      'arbitrum-one': {
        decimal_place: 6,
        contract_address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      },
    },
  },
  {
    id: 'wrapped-bitcoin',
    symbol: 'wbtc',
    name: 'Wrapped Bitcoin',
    platforms: {
      ethereum: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      'arbitrum-one': '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    },
    image:
      'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png',
    current_price: 0,
    // current_price: 65000,
    price_change_percentage_24h: 0,
    market_cap_rank: 4,
    detail_platforms: {
      ethereum: {
        decimal_place: 8,
        contract_address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      },
      'arbitrum-one': {
        decimal_place: 8,
        contract_address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
      },
    },
  },
  // {
  //   id: 'dai',
  //   symbol: 'dai',
  //   name: 'Dai',
  //   platforms: {
  //     ethereum: '0x6b175474e89094c44da98b954eedeac495271d0f',
  //     'arbitrum-one': '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  //   },
  //   image: 'https://assets.coingecko.com/coins/images/9956/large/4943.png',
  //   current_price: 1,
  //   price_change_percentage_24h: 0,
  //   market_cap_rank: 5,
  //   detail_platforms: {
  //     ethereum: {
  //       decimal_place: 18,
  //       contract_address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  //     },
  //     'arbitrum-one': {
  //       decimal_place: 18,
  //       contract_address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  //     },
  //   },
  // },
]

export const useTokenList = () => {
  const stateData = useAppKitState()
  const chainId = stateData?.selectedNetworkId?.split(':')[1] || '1'
  const targetPlatform = CHAIN_ID_TO_PLATFORM[chainId] || 'ethereum'

  // Get the cache key for the current chain
  const cacheKey = `tokenListCache_${chainId}_erc20`
  const cacheTimestampKey = `tokenListCacheTimestamp_${chainId}_erc20`

  // Function to get cached data
  const getCachedData = () => {
    const cachedData = localStorage.getItem(cacheKey)
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey)

    if (cachedData && cachedTimestamp) {
      const cacheAge = Date.now() - parseInt(cachedTimestamp)
      if (cacheAge < TOKEN_CONFIG.CACHE_DURATION) {
        console.log('Using cached token list')
        return JSON.parse(cachedData)
      }
    }
    return null
  }

  // Modify the queryFn in useTokenList to ensure we always have essential tokens
  const {
    data: tokens = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['token-list', chainId, 'erc20'],
    queryFn: async () => {
      try {
        // Check cache first
        const cachedData = getCachedData()
        if (cachedData) {
          return cachedData
        }

        // Start with essential tokens that match the current chain
        let essentialTokens = topTokens.filter((t) => {
          const tokenAddress = getTokenAddressForPlatform(
            t.platforms,
            targetPlatform
          )
          return (
            tokenAddress &&
            isERC20Token(tokenAddress, t.platforms, targetPlatform)
          )
        })

        // Try to fetch additional tokens from CoinGecko with retry logic
        let additionalTokens: CoinGeckoToken[] = []
        let retryCount = 0
        const maxRetries = 2

        for (let page = 1; page <= TOKEN_CONFIG.PAGES_TO_FETCH; page++) {
          try {
            console.log(`Fetching CoinGecko page ${page}...`)
            const response = await fetch(
              `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${TOKEN_CONFIG.TOKENS_PER_PAGE}&page=${page}&sparkline=false&locale=en&precision=full`
            )

            if (response.status === 429) {
              console.log(
                'Rate limited by CoinGecko API, using essential tokens only'
              )
              const formattedEssentialTokens = formatCoingeckoTokens(
                essentialTokens,
                targetPlatform
              )
              return formattedEssentialTokens
            }

            if (!response.ok) {
              throw new Error(
                `Failed to fetch page ${page}: ${response.status}`
              )
            }

            const pageData: CoinGeckoToken[] = await response.json()
            console.log(`Page ${page} data:`, pageData.length, 'tokens')
            additionalTokens = [...additionalTokens, ...pageData]

            // Add significant delay between requests to avoid rate limits
            if (page < TOKEN_CONFIG.PAGES_TO_FETCH) {
              await new Promise((resolve) => setTimeout(resolve, 2000))
            }
          } catch (error) {
            console.error(`Error fetching page ${page}:`, error)
            retryCount++

            if (retryCount > maxRetries) {
              console.log('Max retries reached, using essential tokens only')
              const formattedEssentialTokens = formatCoingeckoTokens(
                essentialTokens,
                targetPlatform
              )
              return formattedEssentialTokens
            }

            // Wait before retrying
            await new Promise((resolve) =>
              setTimeout(resolve, TOKEN_CONFIG.RETRY_DELAY)
            )
            page-- // Retry the same page
            continue
          }
        }

        // Combine and format tokens
        const combinedTokens = [...essentialTokens]

        // Only add additional tokens if we successfully fetched them
        if (additionalTokens.length > 0) {
          const essentialTokenIds = new Set(essentialTokens.map((t) => t.id))
          const uniqueAdditionalTokens = additionalTokens
            .filter((t) => !essentialTokenIds.has(t.id))
            .filter((token) => {
              const hasValidPlatform =
                token.platforms && token.platforms[targetPlatform]
              return hasValidPlatform
            })
            .map((token) => ({
              ...token,
              platforms: token.platforms || {},
              market_cap_rank: token.market_cap_rank || 999999,
              detail_platforms: {
                [targetPlatform]: {
                  decimal_place:
                    token.detail_platforms?.[targetPlatform]?.decimal_place ||
                    18,
                  contract_address: token.platforms?.[targetPlatform] || '',
                },
              },
            })) as EssentialToken[]

          combinedTokens.push(...uniqueAdditionalTokens)
        }

        const formattedTokens = formatCoingeckoTokens(
          combinedTokens,
          targetPlatform
        )

        // Cache the results
        localStorage.setItem(cacheKey, JSON.stringify(formattedTokens))
        localStorage.setItem(cacheTimestampKey, Date.now().toString())

        return formattedTokens
      } catch (error: any) {
        console.error('Error in token list fetch:', error)
        // If everything fails, return essential tokens
        return formatCoingeckoTokens(
          topTokens.filter((t: EssentialToken) => {
            const tokenAddress = getTokenAddressForPlatform(
              t.platforms,
              targetPlatform
            )
            return (
              tokenAddress &&
              isERC20Token(tokenAddress, t.platforms, targetPlatform)
            )
          }),
          targetPlatform
        )
      }
    },
    staleTime: TOKEN_CONFIG.CACHE_DURATION / 2, // Refresh after half the cache duration
    gcTime: TOKEN_CONFIG.CACHE_DURATION, // Keep in garbage collection for full cache duration
    refetchOnWindowFocus: false,
    retry: false, // Disable React Query's automatic retries as we handle them manually
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
