import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import { useState, useCallback, useEffect } from 'react'
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

  const fetchReserves = useCallback(async () => {
    console.log('Fetching reserves with tokens:', {
      selectedTokenFrom,
      selectedTokenTo,
    })
    if (!selectedTokenFrom || !selectedTokenTo) {
      console.log('Missing tokens, skipping fetch')
      setReserveData(null)
      setDexCalculator(null)
      setIsFetchingReserves(false)
      return
    }

    setCalculationError(null)
    setIsFetchingReserves(true)

    try {
      const fromAddress =
        selectedTokenFrom.token_address ||
        '0xdAC17F958D2ee523a2206206994597C13D831ec7'
      const toAddress =
        selectedTokenTo.token_address ||
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' // Default to WETH if no address

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${fromAddress}&tokenB=${toAddress}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch reserves')
      }

      const data = await response.json()
      console.log('Received reserve data:', data)

      if (!data) {
        setCalculationError('No liquidity data received')
        setReserveData(null)
        setDexCalculator(null)
        return
      }

      const reserveDataWithDecimals = {
        ...data,
        token0Decimals: data.decimals.token0 || 18,
        token1Decimals: data.decimals.token1 || 18,
        token0Address: selectedTokenFrom.token_address || '',
        token1Address: selectedTokenTo.token_address || '',
      } as ReserveData

      if (
        !(parseFloat(reserveDataWithDecimals.reserves.token0) > 0) &&
        !(parseFloat(reserveDataWithDecimals.reserves.token1) > 0)
      ) {
        setCalculationError('No liquidity data received')
        setReserveData(null)
        setDexCalculator(null)
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
    } catch (error) {
      console.error('Error fetching reserves:', error)
      setCalculationError('Error fetching liquidity data')
      setReserveData(null)
      setDexCalculator(null)
    } finally {
      setIsFetchingReserves(false)
    }
  }, [selectedTokenFrom, selectedTokenTo, chainId])

  // Fetch reserves when tokens change
  useEffect(() => {
    if (selectedTokenFrom && selectedTokenTo) {
      console.log('Tokens changed, fetching reserves')
      fetchReserves()
    }
  }, [selectedTokenFrom, selectedTokenTo, chainId, fetchReserves])

  return {
    reserveData,
    dexCalculator,
    isFetchingReserves,
    calculationError,
    fetchReserves,
    setCalculationError,
  }
}
