// hooks/useEnhancedTokens.ts
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTokenList } from '../useTokenList'

// Constants
const USDT_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7' // Add your USDT address

// Common token pair interface (same as before)
export interface TokenPair {
  tokenAAddress: string
  tokenASymbol: string
  tokenAName: string
  tokenBAddress: string
  tokenBSymbol: string
  reserveAtotaldepth: number
  reserveBtotaldepth: number
  reserveAtotaldepthWei: string
  reserveBtotaldepthWei: string
  marketCap: string | null
  timestamp: string
  slippageSavings: number
}

// Enhanced token pair with CoinGecko data
export interface EnhancedTokenPair extends TokenPair {
  tokenAIcon: string
  tokenBIcon: string
  tokenAUsdPrice: number
  tokenBUsdPrice: number
}

// Response interfaces
export interface TokenPairsResponse {
  success: boolean
  data: TokenPair[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface TopTokensResponse {
  success: boolean
  data: TokenPair[]
  metric: string
  limit: number
}

export interface SpecificPairResponse {
  success: boolean
  data: TokenPair | null
}

// Enhanced response interfaces
export interface EnhancedTokenPairsResponse {
  success: boolean
  data: EnhancedTokenPair[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface EnhancedTopTokensResponse {
  success: boolean
  data: EnhancedTokenPair[]
  metric: string
  limit: number
}

export interface EnhancedSpecificPairResponse {
  success: boolean
  data: EnhancedTokenPair | null
}

// Parameter interfaces
export interface UseTokenPairsParams {
  address: string | null | undefined
  page?: number
  limit?: number
  enabled?: boolean
}

export interface UseTopTokensParams {
  limit?: number
  metric?:
    | 'reserveAtotaldepth'
    | 'reserveBtotaldepth'
    | 'marketCap'
    | 'slippageSavings'
  enabled?: boolean
}

export interface UseSpecificPairParams {
  tokenA: string | null | undefined
  tokenB: string | null | undefined
  enabled?: boolean
}

// API fetch functions (same as before)
const fetchTokenPairs = async ({
  address,
  page = 1,
  limit = 20,
}: {
  address: string
  page?: number
  limit?: number
}): Promise<TokenPairsResponse> => {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  })

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/tokens/${address}/pairs?${params}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch token pairs: ${response.statusText}`)
  }

  return response.json()
}

const fetchTopTokens = async ({
  limit = 50,
  metric = 'slippageSavings',
}: UseTopTokensParams = {}): Promise<TopTokensResponse> => {
  const params = new URLSearchParams({
    limit: limit.toString(),
    metric,
  })

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/tokens/top?${params}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch top tokens: ${response.statusText}`)
  }

  return response.json()
}

export const fetchSpecificPair = async ({
  tokenA,
  tokenB,
}: {
  tokenA: string
  tokenB: string
}): Promise<SpecificPairResponse> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/pairs/${tokenA}/${tokenB}`
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch specific pair: ${response.statusText}`)
  }

  return response.json()
}

// Custom hook for CoinGecko enhancement logic
export const useTokenEnhancer = () => {
  const {
    tokens: coinGeckoTokens,
    isLoading: isLoadingTokenList,
    error: tokenListError,
  } = useTokenList()

  // Memoized function to find token icon by address or symbol
  const findTokenIcon = useMemo(() => {
    const tokenMap = new Map()

    // Create a map for quick lookups by address and symbol
    coinGeckoTokens.forEach((token) => {
      // Map by address (most reliable)
      if (token.token_address) {
        tokenMap.set(token.token_address.toLowerCase(), token.icon)
      }

      // Map by symbol as fallback
      if (token.symbol) {
        tokenMap.set(token.symbol.toLowerCase(), token.icon)
      }
    })

    return (address: string, symbol: string) => {
      // First try by address
      const iconByAddress = tokenMap.get(address?.toLowerCase())
      if (iconByAddress) return iconByAddress

      // Then try by symbol
      const iconBySymbol = tokenMap.get(symbol?.toLowerCase())
      if (iconBySymbol) return iconBySymbol

      // Fallback to local asset
      return `/tokens/${symbol?.toLowerCase()}.svg`
    }
  }, [coinGeckoTokens])

  // Memoized function to find token USD price by address or symbol
  const findTokenUsdPrice = useMemo(() => {
    const priceMap = new Map()

    // Create a map for quick lookups by address and symbol
    coinGeckoTokens.forEach((token) => {
      // Map by address (most reliable)
      if (token.token_address && token.usd_price !== undefined) {
        priceMap.set(token.token_address.toLowerCase(), token.usd_price)
      }

      // Map by symbol as fallback
      if (token.symbol && token.usd_price !== undefined) {
        priceMap.set(token.symbol.toLowerCase(), token.usd_price)
      }
    })

    return (address: string, symbol: string) => {
      // First try by address
      const priceByAddress = priceMap.get(address?.toLowerCase())
      if (priceByAddress !== undefined) return priceByAddress

      // Then try by symbol
      const priceBySymbol = priceMap.get(symbol?.toLowerCase())
      if (priceBySymbol !== undefined) return priceBySymbol

      // Return 1 if not found
      return 1
    }
  }, [coinGeckoTokens])

  // Enhancement function
  const enhanceTokenPair = useMemo(() => {
    return (pair: TokenPair): EnhancedTokenPair => ({
      ...pair,
      tokenAIcon:
        pair.tokenAAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()
          ? '/tokens/usdt.svg'
          : findTokenIcon(pair.tokenAAddress, pair.tokenASymbol),
      tokenBIcon:
        pair.tokenBAddress.toLowerCase() === USDT_ADDRESS.toLowerCase()
          ? '/tokens/usdt.svg'
          : findTokenIcon(pair.tokenBAddress, pair.tokenBSymbol),
      tokenAUsdPrice: findTokenUsdPrice(pair.tokenAAddress, pair.tokenASymbol),
      tokenBUsdPrice: findTokenUsdPrice(pair.tokenBAddress, pair.tokenBSymbol),
    })
  }, [findTokenIcon, findTokenUsdPrice])

  return {
    enhanceTokenPair,
    isLoadingTokenList,
    tokenListError,
  }
}

// Enhanced hook implementations
export const useEnhancedTokenPairs = (params: UseTokenPairsParams) => {
  const { address, page = 1, limit = 20, enabled = true } = params
  const { enhanceTokenPair, isLoadingTokenList } = useTokenEnhancer()

  const baseQuery = useQuery({
    queryKey: ['tokenPairs', address, { page, limit }],
    queryFn: () => fetchTokenPairs({ address: address!, page, limit }),
    enabled: enabled && !!address,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  const enhancedData = useMemo(() => {
    if (!baseQuery.data?.data || isLoadingTokenList) {
      return baseQuery.data
    }

    return {
      ...baseQuery.data,
      data: baseQuery.data.data.map(enhanceTokenPair),
    } as EnhancedTokenPairsResponse
  }, [baseQuery.data, enhanceTokenPair, isLoadingTokenList])

  return {
    ...baseQuery,
    data: enhancedData,
    isLoadingEnhanced: baseQuery.isLoading || isLoadingTokenList,
  }
}

export const useEnhancedTopTokens = (params: UseTopTokensParams = {}) => {
  const { limit = 50, metric = 'slippageSavings', enabled = true } = params
  const { enhanceTokenPair, isLoadingTokenList } = useTokenEnhancer()

  const baseQuery = useQuery({
    queryKey: ['topTokens', { limit, metric }],
    queryFn: () => fetchTopTokens({ limit, metric }),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  const enhancedData = useMemo(() => {
    if (!baseQuery.data?.data || isLoadingTokenList) {
      return baseQuery.data
    }

    return {
      ...baseQuery.data,
      data: baseQuery.data.data.map(enhanceTokenPair),
    } as EnhancedTopTokensResponse
  }, [baseQuery.data, enhanceTokenPair, isLoadingTokenList])

  return {
    ...baseQuery,
    data: enhancedData,
    isLoadingEnhanced: baseQuery.isLoading || isLoadingTokenList,
  }
}

export const useEnhancedSpecificPair = (params: UseSpecificPairParams) => {
  const { tokenA, tokenB, enabled = true } = params
  const { enhanceTokenPair, isLoadingTokenList } = useTokenEnhancer()

  const baseQuery = useQuery({
    queryKey: ['specificPair', tokenA, tokenB],
    queryFn: () => fetchSpecificPair({ tokenA: tokenA!, tokenB: tokenB! }),
    enabled: enabled && !!tokenA && !!tokenB,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
    refetchOnWindowFocus: false,
  })

  const enhancedData = useMemo(() => {
    if (!baseQuery.data?.data || isLoadingTokenList) {
      return baseQuery.data
    }

    return {
      ...baseQuery.data,
      data: enhanceTokenPair(baseQuery.data.data),
    } as EnhancedSpecificPairResponse
  }, [baseQuery.data, enhanceTokenPair, isLoadingTokenList])

  return {
    ...baseQuery,
    data: enhancedData,
    isLoadingEnhanced: baseQuery.isLoading || isLoadingTokenList,
  }
}

// Unified hook that provides all enhanced methods
export const useEnhancedTokens = () => {
  return {
    useEnhancedTokenPairs,
    useEnhancedTopTokens,
    useEnhancedSpecificPair,
  }
}

// Export individual hooks for convenience
export {
  useEnhancedTokenPairs as useTokenPairsWithIcons,
  useEnhancedTopTokens as useTopTokensWithIcons,
  useEnhancedSpecificPair as useSpecificPairWithIcons,
}
