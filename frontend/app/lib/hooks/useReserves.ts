import { useState, useCallback, useEffect } from 'react'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import { Token } from '@/app/types'

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

  // Clear state when tokens change
  const clearState = useCallback(() => {
    setReserveData(null)
    setDexCalculator(null)
    setCalculationError(null)
  }, [])

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

    // Clear existing data before fetching new
    // clearState()
    setIsFetchingReserves(true)

    try {
      const fromAddress =
        selectedTokenFrom.token_address ||
        '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      const toAddress =
        selectedTokenTo.token_address ||
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'

      console.log('Fetching reserves for addresses:', {
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
        fromAddress !==
          (selectedTokenFrom.token_address ||
            '0xdAC17F958D2ee523a2206206994597C13D831ec7') ||
        toAddress !==
          (selectedTokenTo.token_address ||
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
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
  }, [selectedTokenFrom, selectedTokenTo, chainId, clearState])

  // Fetch reserves when tokens change
  useEffect(() => {
    if (selectedTokenFrom && selectedTokenTo) {
      console.log('Tokens changed, fetching reserves')
      fetchReserves()
    } else {
      clearState()
    }

    return () => {
      // Cleanup effect
      clearState()
    }
  }, [selectedTokenFrom, selectedTokenTo, chainId, fetchReserves, clearState])

  return {
    reserveData,
    dexCalculator,
    isFetchingReserves,
    calculationError,
    fetchReserves,
    setCalculationError,
  }
}
