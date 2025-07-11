import { useState, useCallback, useEffect } from 'react'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import { Token } from '@/app/types'
import { usePrefetchReserves } from './usePrefetchReserves'

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

  // Get prefetched reserves
  const { prefetchedReserves, getPairKey } = usePrefetchReserves({ chainId })

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
      const directKey = getPairKey(fromSymbol, toSymbol)
      const reverseKey = getPairKey(toSymbol, fromSymbol)

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
    [prefetchedReserves, getPairKey]
  )

  // Effect to check prefetched data when tokens change
  useEffect(() => {
    if (!selectedTokenFrom || !selectedTokenTo) {
      setShouldFetchFromBackend(true)
      return
    }

    const fromSymbol = selectedTokenFrom.symbol
    const toSymbol = selectedTokenTo.symbol

    // Check if this pair is in our prefetched data
    const prefetchedPair = checkPrefetchedPair(fromSymbol, toSymbol)

    if (prefetchedPair?.reserveData && prefetchedPair?.dexCalculator) {
      console.log('Using prefetched reserves for', fromSymbol, '-', toSymbol)
      setReserveData(prefetchedPair.reserveData)
      setDexCalculator(prefetchedPair.dexCalculator)
      setShouldFetchFromBackend(false)
    } else {
      setShouldFetchFromBackend(true)
    }
  }, [selectedTokenFrom, selectedTokenTo, checkPrefetchedPair])

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
      const fromAddress = selectedTokenFrom.token_address || ''
      const toAddress = selectedTokenTo.token_address || ''

      console.log('Fetching reserves from backend for addresses:', {
        fromAddress,
        toAddress,
      })

      // Add abort controller for cleanup
      const controller = new AbortController()
      const signal = controller.signal

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${fromAddress}&tokenB=${toAddress}`,
        { signal }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch reserves')
      }

      const data = await response.json()
      console.log('Received reserve data:', data)

      // Check if tokens are still the same after fetch completes
      if (
        !selectedTokenFrom ||
        !selectedTokenTo ||
        fromAddress !== selectedTokenFrom.token_address ||
        toAddress !== selectedTokenTo.token_address
      ) {
        console.log('Tokens changed during fetch, discarding results')
        return
      }

      if (!data) {
        console.log('No liquidity data received')
        setCalculationError('No liquidity data received')
        clearState()
        return
      }

      const reserveDataWithDecimals = {
        ...data,
        token0Decimals: data.decimals.token0 || 18,
        token1Decimals: data.decimals.token1 || 18,
        token0Address: selectedTokenFrom.token_address || '',
        token1Address: selectedTokenTo.token_address || '',
      } as ReserveData

      console.log('Processed reserve data:', reserveDataWithDecimals)

      if (
        !(parseFloat(reserveDataWithDecimals.reserves.token0) > 0) &&
        !(parseFloat(reserveDataWithDecimals.reserves.token1) > 0)
      ) {
        console.log('No valid reserves found')
        setCalculationError('No liquidity data received')
        clearState()
        return
      }

      const calculator = DexCalculatorFactory.createCalculator(
        data.dex,
        undefined,
        chainId
      )

      setReserveData(reserveDataWithDecimals)
      setDexCalculator(calculator)
      console.log('Successfully set reserve data and calculator')
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted')
        return
      }
      console.error('Error fetching reserves:', error)
      setCalculationError('Error fetching liquidity data')
      clearState()
    } finally {
      setIsFetchingReserves(false)
    }
  }, [
    selectedTokenFrom,
    selectedTokenTo,
    chainId,
    clearState,
    shouldFetchFromBackend,
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
