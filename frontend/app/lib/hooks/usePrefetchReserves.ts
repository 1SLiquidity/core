import { useQuery, useQueries, NetworkMode } from '@tanstack/react-query'
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
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    WSOL: '0x0Df040Bda85394A9B36224069D6c70646dB8cbF8', // Wrapped SOL on Ethereum
  },
  '42161': {
    // Arbitrum
    USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    WBTC: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    WSOL: '0x0Df040Bda85394A9B36224069D6c70646dB8cbF8', // Wrapped SOL on Arbitrum
  },
}

// Token pairs to prefetch - prioritized by importance
const PAIRS_TO_PREFETCH = [
  // High priority pairs (stablecoins and major pairs)
  ['USDC', 'WETH'],
  ['USDT', 'WETH'],
  ['USDT', 'USDC'],
  // Medium priority pairs
  ['DAI', 'WETH'],
  ['USDT', 'DAI'],
  ['WETH', 'WBTC'],
] as const

// Cache configuration aligned with backend Redis cache
const CACHE_CONFIG = {
  STALE_TIME: 25000, // 25s (slightly less than backend's 30s)
  GC_TIME: 60000, // 1 minute
  REFETCH_INTERVAL: 20000, // 20s to ensure we have fresh data before backend cache expires
  BATCH_SIZE: 2, // Number of pairs to fetch in parallel
  REQUEST_TIMEOUT: 15000, // 15 second timeout (less than Lambda's 20s)
}

interface ReserveResult {
  reserveData: ReserveData | null
  dexCalculator: DexCalculator | null
  error: string | null
}

interface PrefetchedReserves {
  [key: string]: ReserveResult
}

interface UsePrefetchReservesProps {
  chainId?: string
  enabled?: boolean
}

export const usePrefetchReserves = ({
  chainId = '1',
  enabled = true,
}: UsePrefetchReservesProps = {}) => {
  // Function to create a pair key
  const getPairKey = (fromSymbol: string, toSymbol: string) => {
    return `${fromSymbol}_${toSymbol}`
  }

  // Function to fetch reserves for a token pair with timeout
  const fetchReserves = async (
    fromSymbol: string,
    toSymbol: string
  ): Promise<ReserveResult> => {
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

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(),
        CACHE_CONFIG.REQUEST_TIMEOUT
      )

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${fromAddress}&tokenB=${toAddress}`,
        { signal: controller.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to fetch reserves')
      }

      const data = await response.json()

      if (!data || !data.reserves || !data.decimals) {
        throw new Error('No liquidity data received')
      }

      const reserveDataWithDecimals = {
        dex: data.dex,
        pairAddress: data.pairAddress,
        reserves: data.reserves,
        decimals: data.decimals,
        timestamp: data.timestamp,
        token0Address: fromAddress,
        token1Address: toAddress,
      } as ReserveData

      const calculator = DexCalculatorFactory.createCalculator(
        data.dex,
        undefined,
        chainId
      )

      return {
        reserveData: reserveDataWithDecimals,
        dexCalculator: calculator,
        error: null,
      }
    } catch (error) {
      console.error('Error fetching reserves:', {
        fromSymbol,
        toSymbol,
        error,
      })
      return {
        reserveData: null,
        dexCalculator: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // Use React Query's useQueries for batched parallel fetching
  const queries = useQueries({
    queries: PAIRS_TO_PREFETCH.map(([fromSymbol, toSymbol], index) => ({
      queryKey: ['reserves', chainId, fromSymbol, toSymbol] as const,
      queryFn: () => fetchReserves(fromSymbol, toSymbol),
      staleTime: CACHE_CONFIG.STALE_TIME,
      gcTime: CACHE_CONFIG.GC_TIME,
      refetchInterval: CACHE_CONFIG.REFETCH_INTERVAL,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: false,
      retry: 1,
      retryDelay: 1000,
      enabled: enabled && index < CACHE_CONFIG.BATCH_SIZE * 3, // Load in 3 batches
      networkMode: 'always' as NetworkMode, // Continue fetching even if window is hidden
    })),
  })

  // Combine all results into a single object
  const prefetchedReserves = queries.reduce<PrefetchedReserves>(
    (acc, query, index) => {
      const [fromSymbol, toSymbol] = PAIRS_TO_PREFETCH[index]
      const pairKey = getPairKey(fromSymbol, toSymbol)

      acc[pairKey] = query.data || {
        reserveData: null,
        dexCalculator: null,
        error: query.error ? String(query.error) : null,
      }

      return acc
    },
    {}
  )

  return {
    prefetchedReserves,
    getPairKey,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    errors: queries
      .map((q, i) => q.error && `${PAIRS_TO_PREFETCH[i].join('/')}:${q.error}`)
      .filter(Boolean),
  }
}
