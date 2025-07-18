import { useQuery } from '@tanstack/react-query'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'

// Popular token addresses for different chains
const POPULAR_TOKENS = {
  '1': {
    // Ethereum
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  },
  '42161': {
    // Arbitrum
    USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
  },
  // Add more chains as needed
}

// Token pairs to prefetch
const PAIRS_TO_PREFETCH = [
  ['USDC', 'WETH'],
  ['WETH', 'USDC'],
  ['USDT', 'WETH'],
  ['WETH', 'USDT'],
  ['USDT', 'USDC'],
  ['USDC', 'USDT'],
]

// Cache configuration
const CACHE_CONFIG = {
  STALE_TIME: 30000, // 30 seconds before data is considered stale
  GC_TIME: 60000, // 1 minute before data is removed from cache
  REFETCH_INTERVAL: 25000, // Refetch every 25 seconds (before stale time)
}

interface PrefetchedReserves {
  [key: string]: {
    reserveData: ReserveData | null
    dexCalculator: DexCalculator | null
    error: string | null
  }
}

interface UsePrefetchReservesProps {
  chainId?: string
}

export const usePrefetchReserves = ({
  chainId = '1',
}: UsePrefetchReservesProps = {}) => {
  // Function to create a pair key
  const getPairKey = (tokenA: string, tokenB: string) => `${tokenA}_${tokenB}`

  // Function to fetch reserves for a token pair
  const fetchReserves = async (fromSymbol: string, toSymbol: string) => {
    console.log(`🔄 Prefetching reserves for ${fromSymbol}-${toSymbol} pair...`)
    try {
      const tokens = POPULAR_TOKENS[chainId as keyof typeof POPULAR_TOKENS]
      if (!tokens) {
        throw new Error('Chain not supported')
      }

      const fromAddress = tokens[fromSymbol as keyof typeof tokens]
      const toAddress = tokens[toSymbol as keyof typeof tokens]

      if (!fromAddress || !toAddress) {
        throw new Error('Token not found for chain')
      }

      console.log(`📍 Fetching ${fromSymbol}-${toSymbol} reserves from:`, {
        fromAddress,
        toAddress,
        chainId,
      })

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${fromAddress}&tokenB=${toAddress}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch reserves')
      }

      const data = await response.json()

      if (!data) {
        throw new Error('No liquidity data received')
      }

      console.log(`📥 Received ${fromSymbol}-${toSymbol} reserve data:`, data)

      const reserveDataWithDecimals = {
        ...data,
        token0Decimals: data.decimals.token0 || 18,
        token1Decimals: data.decimals.token1 || 18,
        token0Address: fromAddress,
        token1Address: toAddress,
      } as ReserveData

      const calculator = DexCalculatorFactory.createCalculator(
        data.dex,
        undefined,
        chainId
      )

      console.log(
        `✅ Successfully processed ${fromSymbol}-${toSymbol} reserves`
      )

      return {
        reserveData: reserveDataWithDecimals,
        dexCalculator: calculator,
        error: null,
      }
    } catch (error) {
      console.error(
        `❌ Error fetching reserves for ${fromSymbol}-${toSymbol}:`,
        error
      )
      return {
        reserveData: null,
        dexCalculator: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Use React Query to fetch and cache all pairs in parallel
  const { data: prefetchedReserves = {} } = useQuery({
    queryKey: ['prefetched-reserves', chainId],
    queryFn: async () => {
      console.log(
        '🚀 Starting parallel prefetch for all pairs on chain:',
        chainId
      )
      console.log('📋 Pairs to prefetch:', PAIRS_TO_PREFETCH)

      const results: PrefetchedReserves = {}

      // Fetch all pairs in parallel
      const promises = PAIRS_TO_PREFETCH.map(async ([fromSymbol, toSymbol]) => {
        const pairKey = getPairKey(fromSymbol, toSymbol)
        const result = await fetchReserves(fromSymbol, toSymbol)
        return { pairKey, result }
      })

      // Wait for all fetches to complete
      const pairResults = await Promise.all(promises)

      // Store results in object
      pairResults.forEach(({ pairKey, result }) => {
        results[pairKey] = result
      })

      console.log('🎯 Prefetch completed. Cache status:', {
        successfulPairs: Object.entries(results).filter(
          ([_, data]) => data.error === null
        ).length,
        totalPairs: Object.keys(results).length,
        nextRefetch: new Date(
          Date.now() + CACHE_CONFIG.REFETCH_INTERVAL
        ).toLocaleTimeString(),
        staleAt: new Date(
          Date.now() + CACHE_CONFIG.STALE_TIME
        ).toLocaleTimeString(),
        expiresAt: new Date(
          Date.now() + CACHE_CONFIG.GC_TIME
        ).toLocaleTimeString(),
      })

      console.log('📦 Cached reserves:', results)

      return results
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    refetchInterval: CACHE_CONFIG.REFETCH_INTERVAL, // Refetch every 25 seconds
    refetchIntervalInBackground: true, // Continue refetching even when the window is in the background
    refetchOnWindowFocus: false,
  })

  return {
    prefetchedReserves,
    getPairKey,
  }
}
