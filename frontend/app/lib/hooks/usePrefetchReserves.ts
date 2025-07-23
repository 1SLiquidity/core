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
    USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    DAI: '0x6b175474e89094c44da98b954eedeac495271d0f',
    WETH: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    WBTC: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    WSOL: '0x0Df040Bda85394A9B36224069D6c70646dB8cbF8', // Wrapped SOL on Ethereum
    // RUNE: '0x2030Ea53eccFdE546794Bd34149c71a61773b12b', // THORChain RUNE
    // RUJI: '0xDd7b7f36814c56488C3849218D9d85C3dD8E50C2', // RUJI Token
    // VULT: '0x32c1b3c43317cba8185D65227A54AE416dacc338', // Vulture Token
  },
  '42161': {
    // Arbitrum
    USDC: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',
    USDT: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
    WBTC: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
    WSOL: '0x0Df040Bda85394A9B36224069D6c70646dB8cbF8', // Wrapped SOL on Arbitrum
    // RUNE: '0x2030Ea53eccFdE546794Bd34149c71a61773b12b', // THORChain RUNE on Arbitrum
    // RUJI: '0xDd7b7f36814c56488C3849218D9d85C3dD8E50C2', // RUJI Token on Arbitrum
    // VULT: '0x32c1b3c43317cba8185D65227A54AE416dacc338', // Vulture Token on Arbitrum
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
  ['USDT', 'DAI'],
  ['DAI', 'WETH'],
  ['WETH', 'WBTC'],
  ['WBTC', 'WSOL'],
  // ['WSOL', 'RUNE'],
  // ['RUNE', 'RUJI'],
  // ['RUJI', 'VULT'],
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

      // Fetch all pairs in parallel with a timeout
      const promises = PAIRS_TO_PREFETCH.map(async ([fromSymbol, toSymbol]) => {
        const pairKey = getPairKey(fromSymbol, toSymbol)
        try {
          const result = await Promise.race<{
            reserveData: ReserveData | null
            dexCalculator: DexCalculator | null
            error: string | null
          }>([
            fetchReserves(fromSymbol, toSymbol),
            new Promise(
              (_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 10000) // 10 second timeout
            ),
          ])
          return { pairKey, result }
        } catch (error) {
          console.warn(`Failed to fetch ${fromSymbol}-${toSymbol}:`, error)
          return {
            pairKey,
            result: {
              reserveData: null,
              dexCalculator: null,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          }
        }
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

      return results
    },
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.GC_TIME,
    refetchInterval: CACHE_CONFIG.REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000, // 1 second between retries
    enabled: true, // Always enabled
  })

  return {
    prefetchedReserves,
    getPairKey,
  }
}
