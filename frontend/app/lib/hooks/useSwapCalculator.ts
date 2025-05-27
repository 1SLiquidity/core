import { useEffect, useState } from 'react'
import { DexCalculator } from '@/app/lib/dex/calculators'
import {
  calculateGasAndStreams,
  getAverageBlockTime,
} from '@/app/lib/gas-calculations'
import { ReserveData } from '@/app/types'

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

  useEffect(() => {
    const calculateBuyAmount = async () => {
      console.log('Calculating buy amount with:', {
        sellAmount,
        dexCalculator: !!dexCalculator,
        reserveData: !!reserveData,
      })

      // Reset values if no input amount
      if (sellAmount <= 0) {
        console.log('No sell amount, resetting values')
        setBuyAmount(0)
        setBotGasLimit(null)
        setStreamCount(null)
        return
      }

      // Skip calculation if missing dependencies
      if (!dexCalculator || !reserveData) {
        console.log('Missing calculator or reserve data')
        return
      }

      const isInputOne = sellAmount === 1 || sellAmount.toString() === '1'

      try {
        setIsCalculating(true)
        setCalculationError(null)

        const calculatedBuyAmount = await dexCalculator.calculateOutputAmount(
          sellAmount.toString(),
          reserveData
        )

        console.log('Calculated buy amount:', calculatedBuyAmount)

        try {
          const gasResult = await calculateGasAndStreams(
            dexCalculator.getProvider(),
            sellAmount.toString(),
            {
              reserves: {
                token0: reserveData.reserves.token0,
                token1: reserveData.reserves.token1,
              },
              decimals: {
                token0: reserveData.decimals.token0,
                token1: reserveData.decimals.token1,
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

        if (calculatedBuyAmount === 'Insufficient liquidity') {
          setCalculationError('Insufficient liquidity for this trade')
          setBuyAmount(0)
        } else {
          const numericBuyAmount = parseFloat(calculatedBuyAmount)
          if (!isNaN(numericBuyAmount)) {
            if (isInputOne && reserveData?.dex === 'sushiswap') {
              const adjustedValue = numericBuyAmount / 1000
              setBuyAmount(adjustedValue)
            } else if (isInputOne) {
              setBuyAmount(parseFloat(calculatedBuyAmount))
            } else {
              const formattedAmount = parseFloat(numericBuyAmount.toFixed(8))
              setBuyAmount(formattedAmount)
            }
          } else {
            setCalculationError('Error calculating output amount')
          }
        }
      } catch (error) {
        console.error('Error calculating buy amount:', error)
        setCalculationError('Error calculating output amount')
      } finally {
        setIsCalculating(false)
      }
    }

    calculateBuyAmount()
  }, [sellAmount, dexCalculator, reserveData])

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
