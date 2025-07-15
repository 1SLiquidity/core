import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import { Token } from '@/app/types'

// Cache configuration - matching usePrefetchReserves
const CACHE_CONFIG = {
  STALE_TIME: 30000, // 30 seconds before data is considered stale
  GC_TIME: 60000, // 1 minute before data is removed from cache
  REFETCH_INTERVAL: 25000, // Refetch every 25 seconds (before stale time)
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
      // This query maintains the cache but doesn't fetch anything initially
      return {} as DynamicReservesCache
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
  })

  // Function to add or update a pair in the cache
  const updateCache = async (tokenA: Token, tokenB: Token) => {
    const pairKey = getPairKey(tokenA, tokenB)
    if (!pairKey) return null

    // Check if we need to update the cache
    const existingData = dynamicReserves[pairKey]
    const now = Date.now()
    if (
      existingData &&
      now - existingData.lastUpdated < CACHE_CONFIG.REFETCH_INTERVAL
    ) {
      return existingData
    }

    // Fetch new data
    const result = await fetchReserves(tokenA, tokenB)

    // Update cache
    queryClient.setQueryData(['dynamic-reserves', chainId], (old: any) => ({
      ...old,
      [pairKey]: result,
    }))

    return result
  }

  // Function to get cached data for a pair
  const getCachedReserves = (tokenA: Token | null, tokenB: Token | null) => {
    const pairKey = getPairKey(tokenA, tokenB)
    if (!pairKey) return null

    const cachedData = dynamicReserves[pairKey]
    if (!cachedData) return null

    // Check if cache is stale
    const now = Date.now()
    if (now - cachedData.lastUpdated > CACHE_CONFIG.STALE_TIME) {
      return null
    }

    return cachedData
  }

  return {
    dynamicReserves,
    updateCache,
    getCachedReserves,
    getPairKey,
  }
}
