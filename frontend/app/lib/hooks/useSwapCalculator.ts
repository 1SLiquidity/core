import { useEffect, useState, useRef } from 'react'
import { DexCalculator } from '@/app/lib/dex/calculators'
import {
  calculateGasAndStreams,
  getAverageBlockTime,
} from '@/app/lib/gas-calculations'
import { ReserveData } from '@/app/types'
import { debounce } from 'lodash'

interface UseSwapCalculatorProps {
  sellAmount: number
  dexCalculator: DexCalculator | null
  reserveData: ReserveData | null
}

export const useSwapCalculator = ({
  sellAmount,
  dexCalculator,
  reserveData,
}: UseSwapCalculatorProps) => {
  const [buyAmount, setBuyAmount] = useState(0)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const [botGasLimit, setBotGasLimit] = useState<bigint | null>(null)
  const [streamCount, setStreamCount] = useState<number | null>(null)
  const [estTime, setEstTime] = useState<string>('')

  // Keep track of the latest calculation request and current sell amount
  const latestCalculationId = useRef(0)
  const currentSellAmount = useRef(sellAmount)

  // Update current sell amount ref whenever it changes
  useEffect(() => {
    currentSellAmount.current = sellAmount
  }, [sellAmount])

  // Create a debounced calculation function
  const debouncedCalculation = useRef(
    debounce(
      async (
        amount: number,
        calculator: DexCalculator,
        reserves: ReserveData,
        calculationId: number
      ) => {
        try {
          // Check if the calculation is still valid
          if (
            amount <= 0 ||
            currentSellAmount.current <= 0 ||
            calculationId !== latestCalculationId.current
          ) {
            return
          }

          const calculatedBuyAmount = await calculator.calculateOutputAmount(
            amount.toString(),
            reserves
          )

          // Double check current sell amount before applying any updates
          if (currentSellAmount.current <= 0) {
            return
          }

          // Only update if this is still the latest calculation
          if (calculationId === latestCalculationId.current) {
            if (calculatedBuyAmount === 'Insufficient liquidity') {
              setCalculationError('Insufficient liquidity for this trade')
              setBuyAmount(0)
            } else {
              const numericBuyAmount = parseFloat(calculatedBuyAmount)
              if (!isNaN(numericBuyAmount)) {
                // Only update buy amount if we still have a non-zero sell amount
                if (currentSellAmount.current > 0) {
                  if (amount === 1 && reserves?.dex === 'sushiswap') {
                    setBuyAmount(numericBuyAmount / 1000)
                  } else if (amount === 1) {
                    setBuyAmount(parseFloat(calculatedBuyAmount))
                  } else {
                    setBuyAmount(parseFloat(numericBuyAmount.toFixed(8)))
                  }
                }
              } else {
                setCalculationError('Error calculating output amount')
              }
            }

            // Only proceed with gas calculations if we still have a non-zero sell amount
            if (currentSellAmount.current > 0) {
              try {
                const gasResult = await calculateGasAndStreams(
                  calculator.getProvider(),
                  amount.toString(),
                  {
                    reserves: {
                      token0: reserves.reserves.token0,
                      token1: reserves.reserves.token1,
                    },
                    decimals: {
                      token0: reserves.decimals.token0,
                      token1: reserves.decimals.token1,
                    },
                  }
                )
                setBotGasLimit(gasResult.botGasLimit)
                setStreamCount(gasResult.streamCount)
              } catch (error) {
                console.error('Error calculating gas and streams:', error)
                setBotGasLimit(null)
                setStreamCount(null)
              }
            }
          }
        } catch (error) {
          // Only update error if this is still the latest calculation and we have a non-zero sell amount
          if (
            calculationId === latestCalculationId.current &&
            currentSellAmount.current > 0
          ) {
            console.error('Error calculating buy amount:', error)
            setCalculationError('Error calculating output amount')
          }
        } finally {
          // Only update calculating state if this is still the latest calculation
          if (calculationId === latestCalculationId.current) {
            setIsCalculating(false)
          }
        }
      },
      100
    ) // Debounce for 100ms
  ).current

  // Immediate effect to handle zero value
  useEffect(() => {
    if (sellAmount <= 0) {
      // Cancel any pending calculations
      debouncedCalculation.cancel()
      // Reset all values immediately
      setBuyAmount(0)
      setBotGasLimit(null)
      setStreamCount(null)
      setEstTime('')
      setCalculationError(null)
      setIsCalculating(false)
      return
    }
  }, [sellAmount, debouncedCalculation])

  // Main calculation effect
  useEffect(() => {
    const calculateBuyAmount = async () => {
      // Skip calculation if no input amount or missing dependencies
      if (sellAmount <= 0 || !dexCalculator || !reserveData) {
        return
      }

      // Increment calculation ID
      latestCalculationId.current += 1
      const currentCalculationId = latestCalculationId.current

      setIsCalculating(true)
      setCalculationError(null)

      // Trigger debounced calculation
      debouncedCalculation(
        sellAmount,
        dexCalculator,
        reserveData,
        currentCalculationId
      )
    }

    calculateBuyAmount()

    // Cleanup function to cancel any pending debounced calculations
    return () => {
      debouncedCalculation.cancel()
    }
  }, [sellAmount, dexCalculator, reserveData, debouncedCalculation])

  // Calculate estimated time when streamCount changes
  useEffect(() => {
    const calculateEstTime = async () => {
      if (streamCount && streamCount > 0 && dexCalculator) {
        try {
          const avgBlockTime = await getAverageBlockTime(
            dexCalculator.getProvider()
          )
          const totalSeconds = Math.round(avgBlockTime * streamCount)

          let formatted = ''
          if (totalSeconds < 60) {
            formatted = `${totalSeconds}s`
          } else if (totalSeconds < 3600) {
            formatted = `${Math.floor(totalSeconds / 60)} min`
          } else {
            const h = Math.floor(totalSeconds / 3600)
            const m = Math.floor((totalSeconds % 3600) / 60)
            formatted = `${h} hr${h > 1 ? 's' : ''}${
              m > 0 ? ' ' + m + ' min' : ''
            }`
          }
          setEstTime(formatted)
        } catch {
          setEstTime('')
        }
      } else {
        setEstTime('')
      }
    }

    calculateEstTime()
  }, [streamCount, dexCalculator])

  return {
    buyAmount,
    isCalculating,
    calculationError,
    botGasLimit,
    streamCount,
    estTime,
    setCalculationError,
  }
}
