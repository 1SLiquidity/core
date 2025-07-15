import { useState, useCallback, useEffect } from 'react'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import { Token } from '@/app/types'
import { usePrefetchReserves } from './usePrefetchReserves'
import { useDynamicReserveCache } from './useDynamicReserveCache'

interface UseReservesProps {
  selectedTokenFrom: Token | null
  selectedTokenTo: Token | null
  chainId: string
}

export const useReserves = ({
  selectedTokenFrom,
  selectedTokenTo,
  chainId,
}: UseReservesProps) => {
  const [reserveData, setReserveData] = useState<ReserveData | null>(null)
  const [dexCalculator, setDexCalculator] = useState<DexCalculator | null>(null)
  const [isFetchingReserves, setIsFetchingReserves] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const [shouldFetchFromBackend, setShouldFetchFromBackend] = useState(true)

  // Get prefetched reserves and dynamic cache
  const { prefetchedReserves, getPairKey: getPrefetchedPairKey } =
    usePrefetchReserves({ chainId })
  const { dynamicReserves, updateCache, getCachedReserves } =
    useDynamicReserveCache({ chainId })

  // Clear state when tokens change
  const clearState = useCallback(() => {
    setReserveData(null)
    setDexCalculator(null)
    setCalculationError(null)
  }, [])

  // Check if a token pair is in our prefetched list
  const checkPrefetchedPair = useCallback(
    (fromSymbol: string | undefined, toSymbol: string | undefined) => {
      if (!fromSymbol || !toSymbol) return null

      // Try both directions (e.g., USDC-WETH and WETH-USDC)
      const directKey = getPrefetchedPairKey(fromSymbol, toSymbol)
      const reverseKey = getPrefetchedPairKey(toSymbol, fromSymbol)

      const directPair = prefetchedReserves[directKey]
      const reversePair = prefetchedReserves[reverseKey]

      // Only return cached data if there's no error
      if (directPair?.error === null && directPair?.reserveData) {
        return directPair
      }
      if (reversePair?.error === null && reversePair?.reserveData) {
        return reversePair
      }

      return null
    },
    [prefetchedReserves, getPrefetchedPairKey]
  )

  // Effect to check both prefetched data and dynamic cache when tokens change
  useEffect(() => {
    if (!selectedTokenFrom || !selectedTokenTo) {
      setShouldFetchFromBackend(true)
      return
    }

    // First check prefetched pairs
    const fromSymbol = selectedTokenFrom.symbol
    const toSymbol = selectedTokenTo.symbol
    const prefetchedPair = checkPrefetchedPair(fromSymbol, toSymbol)

    if (prefetchedPair?.reserveData && prefetchedPair?.dexCalculator) {
      console.log('Using prefetched reserves for', fromSymbol, '-', toSymbol)
      setReserveData(prefetchedPair.reserveData)
      setDexCalculator(prefetchedPair.dexCalculator)
      setShouldFetchFromBackend(false)
      return
    }

    // Then check dynamic cache
    const dynamicCacheData = getCachedReserves(
      selectedTokenFrom,
      selectedTokenTo
    )
    if (dynamicCacheData?.reserveData && dynamicCacheData?.dexCalculator) {
      console.log(
        'Using dynamically cached reserves for',
        fromSymbol,
        '-',
        toSymbol
      )
      setReserveData(dynamicCacheData.reserveData)
      setDexCalculator(dynamicCacheData.dexCalculator)
      setShouldFetchFromBackend(false)
      return
    }

    setShouldFetchFromBackend(true)
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    checkPrefetchedPair,
    getCachedReserves,
  ])

  const fetchReserves = useCallback(async () => {
    console.log('Fetching reserves with tokens:', {
      selectedTokenFrom,
      selectedTokenTo,
    })
    if (!selectedTokenFrom || !selectedTokenTo) {
      console.log('Missing tokens, skipping fetch')
      clearState()
      setIsFetchingReserves(false)
      return
    }

    // Skip backend fetch if we're using cached data
    if (!shouldFetchFromBackend) {
      console.log('Using cached data, skipping backend fetch')
      setIsFetchingReserves(false)
      return
    }

    setIsFetchingReserves(true)

    try {
      // Update dynamic cache and use the result
      const result = await updateCache(selectedTokenFrom, selectedTokenTo)

      if (result?.reserveData && result?.dexCalculator) {
        setReserveData(result.reserveData)
        setDexCalculator(result.dexCalculator)
        setCalculationError(null)
        console.log(
          'Successfully set reserve data and calculator from dynamic cache'
        )
      } else if (result?.error) {
        console.error('Error from dynamic cache:', result.error)
        setCalculationError(result.error)
        setReserveData(null)
        setDexCalculator(null)
      }
    } catch (error: any) {
      console.error('Error fetching reserves:', error)
      setCalculationError('Error fetching liquidity data')
      setReserveData(null)
      setDexCalculator(null)
    } finally {
      setIsFetchingReserves(false)
    }
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    shouldFetchFromBackend,
    updateCache,
    clearState,
  ])

  // Fetch reserves when tokens change or when shouldFetchFromBackend changes
  useEffect(() => {
    if (selectedTokenFrom && selectedTokenTo) {
      console.log('Tokens or fetch flag changed, fetching reserves')
      fetchReserves()
    } else {
      clearState()
    }

    return () => {
      // Cleanup effect
      clearState()
    }
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    chainId,
    fetchReserves,
    clearState,
    shouldFetchFromBackend,
  ])

  return {
    reserveData,
    dexCalculator,
    isFetchingReserves,
    calculationError,
    fetchReserves,
    setCalculationError,
  }
}
