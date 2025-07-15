import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import { Token } from '@/app/types'

// Cache configuration - matching usePrefetchReserves
const CACHE_CONFIG = {
  STALE_TIME: 40000, // 40 seconds before data is considered stale
  GC_TIME: 60000, // 1 minute before data is removed from cache
  REFETCH_INTERVAL: 30000, // Refetch every 30 seconds (before stale time)
}

interface DynamicReservesCache {
  [key: string]: {
    reserveData: ReserveData | null
    dexCalculator: DexCalculator | null
    error: string | null
    lastUpdated: number
  }
}

interface UseDynamicReserveCacheProps {
  chainId?: string
}

export const useDynamicReserveCache = ({
  chainId = '1',
}: UseDynamicReserveCacheProps = {}) => {
  const queryClient = useQueryClient()

  // Function to create a unique pair key
  const getPairKey = (tokenA: Token | null, tokenB: Token | null) => {
    if (!tokenA?.token_address || !tokenB?.token_address) return null
    return `${tokenA.token_address}_${tokenB.token_address}`
  }

  // Function to fetch reserves for a token pair
  const fetchReserves = async (tokenA: Token, tokenB: Token) => {
    console.log(
      `🔄 Fetching dynamic reserves for ${tokenA.symbol}-${tokenB.symbol} pair...`
    )
    try {
      if (!tokenA.token_address || !tokenB.token_address) {
        throw new Error('Invalid token addresses')
      }

      console.log(
        `📍 Fetching ${tokenA.symbol}-${tokenB.symbol} reserves from:`,
        {
          tokenA: tokenA.token_address,
          tokenB: tokenB.token_address,
          chainId,
        }
      )

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${tokenA.token_address}&tokenB=${tokenB.token_address}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch reserves')
      }

      const data = await response.json()

      if (!data) {
        throw new Error('No liquidity data received')
      }

      console.log(
        `📥 Received ${tokenA.symbol}-${tokenB.symbol} reserve data:`,
        data
      )

      const reserveDataWithDecimals = {
        ...data,
        token0Decimals: data.decimals.token0 || 18,
        token1Decimals: data.decimals.token1 || 18,
        token0Address: tokenA.token_address,
        token1Address: tokenB.token_address,
      } as ReserveData

      const calculator = DexCalculatorFactory.createCalculator(
        data.dex,
        undefined,
        chainId
      )

      console.log(
        `✅ Successfully processed ${tokenA.symbol}-${tokenB.symbol} reserves`
      )

      return {
        reserveData: reserveDataWithDecimals,
        dexCalculator: calculator,
        error: null,
        lastUpdated: Date.now(),
      }
    } catch (error) {
      console.error(
        `❌ Error fetching reserves for ${tokenA.symbol}-${tokenB.symbol}:`,
        error
      )
      return {
        reserveData: null,
        dexCalculator: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: Date.now(),
      }
    }
  }

  // Use React Query to manage the dynamic cache
  const { data: dynamicReserves = {} } = useQuery({
    queryKey: ['dynamic-reserves', chainId],
    queryFn: async () => {
      return {} as DynamicReservesCache
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    refetchOnWindowFocus: false,
  })

  // Function to add or update a pair in the cache
  const updateCache = async (tokenA: Token, tokenB: Token) => {
    const pairKey = getPairKey(tokenA, tokenB)
    if (!pairKey) return null

    // First check if we have fresh data in the cache
    const existingData = queryClient.getQueryData([
      'token-pair',
      chainId,
      pairKey,
    ]) as DynamicReservesCache[string]

    const now = Date.now()
    if (
      existingData?.lastUpdated &&
      now - existingData.lastUpdated < CACHE_CONFIG.REFETCH_INTERVAL
    ) {
      console.log('Using cached data for', tokenA.symbol, '-', tokenB.symbol)
      return existingData
    }

    // If no fresh data, fetch new data
    const newData = await fetchReserves(tokenA, tokenB)

    // Update the cache
    queryClient.setQueryData(['token-pair', chainId, pairKey], newData)

    return newData
  }

  // Function to get cached data for a pair
  const getCachedReserves = (tokenA: Token | null, tokenB: Token | null) => {
    const pairKey = getPairKey(tokenA, tokenB)
    if (!pairKey) return null

    // Try to get data from the query cache
    const cachedData = queryClient.getQueryData([
      'token-pair',
      chainId,
      pairKey,
    ]) as DynamicReservesCache[string]

    if (!cachedData) return null

    // Check if cache is still fresh
    const now = Date.now()
    if (now - cachedData.lastUpdated > CACHE_CONFIG.STALE_TIME) {
      return null
    }

    return cachedData
  }

  // Set up background refetching for active pairs
  useQuery({
    queryKey: ['refresh-dynamic-reserves', chainId],
    queryFn: async () => {
      // Get all queries that match our token pair pattern
      const queries = queryClient.getQueriesData<DynamicReservesCache[string]>({
        queryKey: ['token-pair', chainId],
      })

      // Refresh each active pair
      for (const [queryKey, data] of queries) {
        if (Array.isArray(queryKey) && queryKey.length === 3) {
          const pairKey = queryKey[2] as string
          const [address1, address2] = pairKey.split('_')
          if (address1 && address2) {
            const tokenA = { token_address: address1 } as Token
            const tokenB = { token_address: address2 } as Token
            const newData = await fetchReserves(tokenA, tokenB)
            queryClient.setQueryData(queryKey, newData)
          }
        }
      }
      return null
    },
    refetchInterval: CACHE_CONFIG.REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
    enabled: true,
  })

  return {
    dynamicReserves,
    updateCache,
    getCachedReserves,
    getPairKey,
  }
}
