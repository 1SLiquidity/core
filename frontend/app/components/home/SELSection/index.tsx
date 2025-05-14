'use client'

import { SEL_SECTION_TABS } from '@/app/lib/constants'
import { useToast } from '@/app/lib/context/toastProvider'
import { isNumberValid } from '@/app/lib/helper'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'
import Button from '../../button'
import Tabs from '../../tabs'
import NotifiSwapStream from '../../toasts/notifiSwapStream'
import DetailSection from '../detailSection'
import CoinBuySection from './coinBuySection'
import CoinSellSection from './coinSellSection'
import LimitSection from './limitSection'
import SwapBox from './swapBox'
import { useModal } from '@/app/lib/context/modalContext'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import {
  DexCalculator,
  DexCalculatorFactory,
  ReserveData,
} from '@/app/lib/dex/calculators'
import useDebounce from '@/app/lib/hooks/useDebounce'

const SELSection = () => {
  const [activeTab, setActiveTab] = useState(SEL_SECTION_TABS[0])
  const [sellAmount, setSellAmount] = useState(0)
  const [buyAmount, setBuyAmount] = useState(0)
  const [isSellAmountActive, setIsSellAmountActive] = useState(false)
  const [invaliSelldAmount, setInvalidSellAmount] = useState(false)
  const [invalidBuyAmount, setInvalidBuyAmount] = useState(false)
  const [swap, setSwap] = useState(false)
  const [dexCalculator, setDexCalculator] = useState<DexCalculator | null>(null)
  const [reserveData, setReserveData] = useState<ReserveData | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)

  // Add a ref to track the last calculation source to prevent loops
  const calculationSourceRef = useRef<'sell' | 'buy' | null>(null)

  // Add a ref to track when we're resetting values to zero
  const isClearingValuesRef = useRef<boolean>(false)

  // Track the last calculation timestamp to prevent rapid recalculations
  const lastCalculationRef = useRef<number>(0)

  // Debounce input values - reduce debounce time for better responsiveness
  const debouncedSellAmount = useDebounce(sellAmount, 300)
  const debouncedBuyAmount = useDebounce(buyAmount, 300)

  const { addToast } = useToast()
  const { selectedTokenFrom, selectedTokenTo } = useModal()
  const { address, isConnected } = useAppKitAccount()

  // Get current chain from AppKit
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]

  // Preload the token list when the component mounts
  const { tokens, isLoading } = useTokenList()

  // Fetch reserves only when tokens change or chain changes
  useEffect(() => {
    const fetchReserves = async () => {
      console.log('Fetching reserves')
      setCalculationError(null)

      if (selectedTokenFrom && selectedTokenTo) {
        try {
          // Check if tokens have addresses
          // const fromAddress =
          //   selectedTokenFrom.token_address ||
          //   '0xdAC17F958D2ee523a2206206994597C13D831ec7' // Default to USDT if no address
          // const toAddress =
          //   selectedTokenTo.token_address ||
          //   '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' // Default to UNI if no address

          // TODO: Remove this after testing and use above commented out code
          const fromAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7' // Default to USDT if no address
          const toAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' // Default to UNI if no address

          // Removed chainId parameter from the API request
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${fromAddress}&tokenB=${toAddress}`
          )

          console.log('Reserve API response ===>', response)

          if (!response.ok) {
            throw new Error('Failed to fetch reserves')
          }

          const data = await response.json()
          console.log('Reserves data:', data)

          if (!Array.isArray(data) && data) {
            // Single object response
            setReserveData(data as ReserveData)
            // Initialize the appropriate calculator based on DEX type
            const calculator = DexCalculatorFactory.createCalculator(
              data.dex,
              undefined, // No fee percent for now
              chainId // Pass the current chainId
            )
            setDexCalculator(calculator)
            console.log(
              `Using ${
                data.dex
              } calculator with fee: ${calculator.getExchangeFee()}% on chain ${chainId}`
            )
            return
          }

          if (!Array.isArray(data) || data.length === 0) {
            setCalculationError('No liquidity pools found for this pair')
            setReserveData(null)
            setDexCalculator(null)
            return
          }

          // First check if we have any Uniswap V3 pools with sufficient liquidity
          const v3Pools = data
            .filter(
              (entry) =>
                entry.dex.startsWith('uniswap-v3') &&
                parseFloat(entry.reserves.token0) > 0
            )
            .sort(
              (a, b) =>
                parseFloat(b.reserves.token0) - parseFloat(a.reserves.token0)
            )

          // Next check for Uniswap V2 pools
          const uniswapV2Data = data.find(
            (entry) =>
              entry.dex === 'uniswap-v2' &&
              parseFloat(entry.reserves.token0) > 0
          )

          // Finally check for SushiSwap pools
          const sushiswapData = data.find(
            (entry) =>
              entry.dex === 'sushiswap' && parseFloat(entry.reserves.token0) > 0
          )

          // Select the best pool based on liquidity and preference
          let selectedPool = null
          let poolType = ''

          // Prefer V3 pools with the highest liquidity
          // if (v3Pools.length > 0) {
          //   selectedPool = v3Pools[0]
          //   poolType = 'Uniswap V3'
          // }
          // Otherwise try Uniswap V2
          // if (uniswapV2Data) {
          //   selectedPool = uniswapV2Data
          //   poolType = 'Uniswap V2'
          // }

          // TODO: Uncomment above code after testing this
          // Finally fall back to SushiSwap
          if (sushiswapData) {
            selectedPool = sushiswapData
            poolType = 'SushiSwap'
          }

          console.log('Selected pool:', selectedPool)

          if (!selectedPool) {
            setCalculationError(
              'No liquidity pool found with sufficient liquidity for this pair'
            )
            setReserveData(null)
            setDexCalculator(null)
            return
          }

          // Set the reserve data for calculations
          setReserveData(selectedPool as ReserveData)

          // Initialize the appropriate calculator
          const calculator = DexCalculatorFactory.createCalculator(
            selectedPool.dex,
            undefined, // No fee percent for now
            chainId // Pass the current chainId
          )
          setDexCalculator(calculator)
          console.log(
            `Using ${poolType} calculator (${
              selectedPool.dex
            }) with fee: ${calculator.getExchangeFee()}% on chain ${chainId}`
          )

          // Trigger an initial calculation if the sell amount is already set
          if (sellAmount > 0) {
            console.log(
              'Triggering initial calculation with sell amount:',
              sellAmount
            )
            // Wait for state to update before triggering calculation
            setTimeout(() => {
              calculationSourceRef.current = 'sell'
              setSellAmount(sellAmount) // Re-setting to trigger calculation
            }, 100)
          }
        } catch (error) {
          console.error('Error fetching reserves:', error)
          setCalculationError('Error fetching liquidity data')
          setReserveData(null)
          setDexCalculator(null)
        }
      } else {
        setReserveData(null)
        setDexCalculator(null)
      }
    }

    fetchReserves()
  }, [selectedTokenFrom, selectedTokenTo, chainId, sellAmount])

  // Prevent calculation if it's too soon after the last one
  const shouldCalculate = () => {
    // If we're in the process of clearing values, don't calculate
    if (isClearingValuesRef.current) {
      console.log('Clearing values in progress, skipping calculation')
      return false
    }

    // If either sell or buy amount is explicitly zero, we shouldn't calculate
    if (sellAmount === 0 || buyAmount === 0) {
      console.log('One of the amounts is zero, skipping calculation')
      return false
    }

    const now = Date.now()

    // For SushiSwap specifically, add extra delay to prevent flickering
    const delayTime = reserveData?.dex === 'sushiswap' ? 300 : 150

    // If lastCalculationRef is reset to 0, it means we want to force a calculation
    if (lastCalculationRef.current === 0) {
      console.log('Calculation forced - bypassing locks')
      // Set a new timestamp to prevent immediate recalculation after this one
      lastCalculationRef.current = now
      return true
    }

    // Check if enough time has passed since the last calculation
    if (now - lastCalculationRef.current < delayTime) {
      console.log(`Too soon to calculate. Waiting for ${delayTime}ms to pass.`)
      return false
    }

    // Update the calculation timestamp
    lastCalculationRef.current = now
    return true
  }

  // Use sell amount for calculations - only if sell is the active input
  useEffect(() => {
    // If we're clearing values, skip calculation to prevent loops
    if (isClearingValuesRef.current) {
      console.log('Skipping calculation because values are being cleared')
      return
    }

    // Use the most recent sell amount to drive calculations
    const currentSellAmount = sellAmount
    const isInputOne =
      currentSellAmount === 1 || currentSellAmount?.toString() === '1'

    // Skip calculation if the source is "buy" to avoid feedback loops
    if (calculationSourceRef.current === 'buy') {
      console.log('Skipping sell calculation - buy is the source')
      return
    }

    // Make sure we have all requirements for calculation
    if (!(dexCalculator && reserveData && !isSellAmountActive)) {
      console.log('Missing requirements for sell → buy calculation')
      return
    }

    // Don't calculate if there's no amount to calculate with
    if (currentSellAmount <= 0) {
      console.log('No sell amount to calculate with')
      return
    }

    // For SushiSwap and value 1, we always want to calculate
    const isForcedCalculation =
      isInputOne && reserveData?.dex === 'sushiswap' && !isCalculating

    // Only calculate if not already calculating
    if (isCalculating && !isForcedCalculation) {
      console.log('Already calculating, skipping')
      return
    }

    // Only run the calculation if shouldCalculate or it's a forced calculation
    if (shouldCalculate() || isForcedCalculation) {
      console.log('Starting calculation with sell amount:', currentSellAmount, {
        calculator: dexCalculator?.constructor.name,
        reserves: reserveData,
        dex: reserveData?.dex,
        isSpecialCase: isInputOne,
      })

      const calculateBuyAmount = async () => {
        try {
          setIsCalculating(true)
          calculationSourceRef.current = 'sell' // Mark that sell is driving the calculation
          setCalculationError(null)

          console.log('Calculating output amount with:', {
            sellAmount: currentSellAmount.toString(),
            reserveData,
          })

          const calculatedBuyAmount = await dexCalculator.calculateOutputAmount(
            currentSellAmount.toString(),
            reserveData
          )

          console.log(
            'Calculation result for sell =',
            currentSellAmount,
            ':',
            calculatedBuyAmount
          )

          if (calculatedBuyAmount === 'Insufficient liquidity') {
            setCalculationError('Insufficient liquidity for this trade')
            setBuyAmount(0)
          } else {
            // Update buy amount if it's a valid number
            const numericBuyAmount = parseFloat(calculatedBuyAmount)
            if (!isNaN(numericBuyAmount)) {
              // For special value of 1 with SushiSwap, need to handle unit conversion
              if (isInputOne && reserveData?.dex === 'sushiswap') {
                console.log(
                  'Special handling for SushiSwap with sell amount = 1, adjusting units'
                )
                // SushiSwap returns values in KEther for input=1, need to convert back to Ether
                // Divide by 1000 to convert from KEther to Ether for UI consistency
                const adjustedValue = numericBuyAmount / 1000
                console.log(
                  'Converting SushiSwap result from KEther to Ether:',
                  numericBuyAmount,
                  '->',
                  adjustedValue
                )
                // Make sure we use the adjusted value, not the raw KEther value
                setBuyAmount(adjustedValue)
                console.log(
                  'Set buy amount for SushiSwap input=1 to:',
                  adjustedValue
                )
              } else if (isInputOne) {
                console.log(
                  'Special handling for sell amount = 1, using exact result'
                )
                setBuyAmount(parseFloat(calculatedBuyAmount))
              } else {
                // Format to a reasonable number of decimal places to avoid excessive precision
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
          // Clear the calculation source after a delay to allow state to settle
          setTimeout(() => {
            if (calculationSourceRef.current === 'sell') {
              calculationSourceRef.current = null
            }
          }, 300)
        }
      }

      calculateBuyAmount()
    } else {
      console.log(
        'Skipping buy amount calculation due to calculation throttling'
      )
    }
  }, [
    sellAmount, // Use direct sellAmount (not debounced) for more immediate response
    reserveData,
    dexCalculator,
    isSellAmountActive,
    isCalculating,
  ])

  // Use buy amount for calculations - only if buy is the active input
  useEffect(() => {
    // If we're clearing values, skip calculation to prevent loops
    if (isClearingValuesRef.current) {
      console.log('Skipping calculation because values are being cleared')
      return
    }

    // Use the most recent buy amount to drive calculations
    const currentBuyAmount = buyAmount
    const isInputOne =
      currentBuyAmount === 1 || currentBuyAmount?.toString() === '1'

    // Skip calculation if the source is "sell" to avoid feedback loops
    if (calculationSourceRef.current === 'sell') {
      console.log('Skipping buy calculation - sell is the source')
      return
    }

    // Make sure we have all requirements for calculation
    if (!(dexCalculator && reserveData && isSellAmountActive)) {
      console.log('Missing requirements for buy → sell calculation')
      return
    }

    // Don't calculate if there's no amount to calculate with
    if (currentBuyAmount <= 0) {
      console.log('No buy amount to calculate with')
      return
    }

    // For SushiSwap and value 1, we always want to calculate
    const isForcedCalculation =
      isInputOne && reserveData?.dex === 'sushiswap' && !isCalculating

    // Only calculate if not already calculating
    if (isCalculating && !isForcedCalculation) {
      console.log('Already calculating, skipping')
      return
    }

    // Only run the calculation if shouldCalculate or it's a forced calculation
    if (shouldCalculate() || isForcedCalculation) {
      console.log('Starting calculation with buy amount:', currentBuyAmount, {
        calculator: dexCalculator?.constructor.name,
        reserves: reserveData,
        dex: reserveData?.dex,
        isSpecialCase: isInputOne,
      })

      const calculateSellAmount = async () => {
        try {
          setIsCalculating(true)
          calculationSourceRef.current = 'buy' // Mark that buy is driving the calculation
          setCalculationError(null)

          console.log('Calculating input amount with:', {
            buyAmount: currentBuyAmount.toString(),
            reserveData,
          })

          // For SushiSwap with buy amount = 1, adjust the input for unit consistency
          let calculationInput = currentBuyAmount.toString()
          if (isInputOne && reserveData?.dex === 'sushiswap') {
            // When calculating reverse with SushiSwap, we need to use KEther units
            calculationInput = '1000'
            console.log(
              'Adjusting SushiSwap buy amount to KEther:',
              calculationInput
            )
          }

          // Calculate what sell amount would produce this buy amount
          const calculatedSellAmount = await dexCalculator.calculateInputAmount(
            calculationInput,
            reserveData
          )

          console.log(
            'Calculation result for buy =',
            currentBuyAmount,
            ':',
            calculatedSellAmount
          )

          if (calculatedSellAmount === 'Insufficient liquidity') {
            setCalculationError('Insufficient liquidity for this trade')
            setSellAmount(0)
          } else {
            // Update sell amount if it's a valid number
            const numericSellAmount = parseFloat(calculatedSellAmount)
            if (!isNaN(numericSellAmount)) {
              // For SushiSwap with special value, handle unit conversion
              if (isInputOne && reserveData?.dex === 'sushiswap') {
                console.log(
                  'Handling SushiSwap unit conversion for buy amount = 1'
                )
                setSellAmount(numericSellAmount)
              } else if (isInputOne) {
                console.log(
                  'Special handling for buy amount = 1, using exact result'
                )
                setSellAmount(numericSellAmount)
              } else {
                // Format to a reasonable number of decimal places
                const formattedAmount = parseFloat(numericSellAmount.toFixed(8))
                setSellAmount(formattedAmount)
              }
            } else {
              setCalculationError('Error calculating input amount')
            }
          }
        } catch (error) {
          console.error('Error calculating sell amount:', error)
          setCalculationError('Error calculating input amount')
        } finally {
          setIsCalculating(false)
          // Clear the calculation source after a delay to allow state to settle
          setTimeout(() => {
            if (calculationSourceRef.current === 'buy') {
              calculationSourceRef.current = null
            }
          }, 300)
        }
      }

      calculateSellAmount()
    } else {
      console.log(
        'Skipping sell amount calculation due to calculation throttling'
      )
    }
  }, [
    buyAmount, // Use direct buyAmount (not debounced) for more immediate response
    reserveData,
    dexCalculator,
    isSellAmountActive,
    isCalculating,
  ])

  // Validate amounts
  useEffect(() => {
    if (!isNumberValid(sellAmount)) {
      setInvalidSellAmount(true)
    } else {
      setInvalidSellAmount(false)
    }

    if (!isNumberValid(buyAmount)) {
      setInvalidBuyAmount(true)
    } else {
      setInvalidBuyAmount(false)
    }
  }, [sellAmount, buyAmount])

  const handleSwap = () => {
    if (sellAmount > 0 || buyAmount > 0) {
      // Clear calculation source and set a new timestamp to prevent immediate recalculation
      calculationSourceRef.current = null
      lastCalculationRef.current = Date.now()

      setSellAmount(buyAmount)
      setBuyAmount(sellAmount)
      setSwap(!swap)
    }
  }

  // Fix the input handling to ensure the latest value is used for calculations
  const handleSellAmountChange = (val: any) => {
    // Check if the value has actually changed to avoid unnecessary rerenders
    if (val === sellAmount) return

    console.log('Updating sell amount from:', sellAmount, 'to:', val)

    // Clear any previous calculations and calculation source
    calculationSourceRef.current = null

    // First update the state directly to improve UI responsiveness
    setSellAmount(val)
    setIsSellAmountActive(false)

    // If the value is zero, reset the buy amount as well
    if (val === 0 || val === '0' || val === '') {
      console.log('Sell amount is zero, resetting buy amount')
      // Set flag that we're clearing values to prevent calculation loops
      isClearingValuesRef.current = true
      setBuyAmount(0)
      setCalculationError(null) // Clear any calculation errors

      // Reset flag after a delay to allow state to settle
      setTimeout(() => {
        isClearingValuesRef.current = false
      }, 100)
      return // No need to trigger calculation
    }

    // Force a recalculation with the new value by resetting any lockouts
    lastCalculationRef.current = 0

    // This will force a new calculation to run immediately
    setTimeout(() => {
      // Set calculation source after state has updated
      calculationSourceRef.current = 'sell'
      console.log('Triggering calculation with new sell amount:', val)
    }, 50)
  }

  // Fix the buy amount handler similarly
  const handleBuyAmountChange = (val: any) => {
    // Check if the value has actually changed to avoid unnecessary rerenders
    if (val === buyAmount) return

    console.log('Updating buy amount from:', buyAmount, 'to:', val)

    // Clear any previous calculations and calculation source
    calculationSourceRef.current = null

    // First update the state directly to improve UI responsiveness
    setBuyAmount(val)
    setIsSellAmountActive(true)

    // If the value is zero, reset the sell amount as well
    if (val === 0 || val === '0' || val === '') {
      console.log('Buy amount is zero, resetting sell amount')
      // Set flag that we're clearing values to prevent calculation loops
      isClearingValuesRef.current = true
      setSellAmount(0)
      setCalculationError(null) // Clear any calculation errors

      // Reset flag after a delay to allow state to settle
      setTimeout(() => {
        isClearingValuesRef.current = false
      }, 100)
      return // No need to trigger calculation
    }

    // Force a recalculation with the new value by resetting any lockouts
    lastCalculationRef.current = 0

    // This will force a new calculation to run immediately
    setTimeout(() => {
      // Set calculation source after state has updated
      calculationSourceRef.current = 'buy'
      console.log('Triggering calculation with new buy amount:', val)
    }, 50)
  }

  // Get DEX fee for display
  const getDexFee = () => {
    if (!dexCalculator) return null
    return dexCalculator.getExchangeFee()
  }

  return (
    <div className="md:min-w-[500px] max-w-[500px] w-[95vw] p-2">
      <div className="w-full flex justify-between gap-2 mb-4">
        <div className="w-fit">
          <Tabs
            tabs={SEL_SECTION_TABS}
            theme="secondary"
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        {/* setting button */}
        <SettingButton />
      </div>

      {activeTab.title === 'Limit' && (
        <LimitSection
          active={isSellAmountActive}
          setActive={setIsSellAmountActive}
        />
      )}
      <div className="w-full mt-4 flex flex-col relative gap-[23px]">
        {swap ? (
          <CoinBuySection
            amount={buyAmount}
            setAmount={handleBuyAmountChange}
            inValidAmount={invalidBuyAmount}
            swap={swap}
          />
        ) : (
          <CoinSellSection
            amount={sellAmount}
            setAmount={handleSellAmountChange}
            inValidAmount={invaliSelldAmount}
          />
        )}
        <div
          onClick={handleSwap}
          className="absolute items-center flex border-[#1F1F1F] border-[2px] border-opacity-[1.5] bg-black justify-center cursor-pointer rounded-[6px] right-[calc(50%_-_42px)] top-[calc(50%_-_2rem)] rotate-45 z-50"
        >
          <div className="w-[25.3px] h-[22.8px] absolute bg-black -rotate-45 -z-30 -left-[14px] top-[50.8px]" />
          <div className="w-[26.4px] h-[22.8px] absolute bg-black -rotate-45 -z-30 -right-[11.8px] -top-[13.2px]" />
          <SwapBox active={sellAmount > 0 || buyAmount > 0} />
        </div>
        {swap ? (
          <CoinSellSection
            amount={sellAmount}
            setAmount={handleSellAmountChange}
            inValidAmount={invaliSelldAmount}
            swap={swap}
          />
        ) : (
          <CoinBuySection
            amount={buyAmount}
            setAmount={handleBuyAmountChange}
            inValidAmount={invalidBuyAmount}
            swap={swap}
          />
        )}
      </div>

      {/* Error message for calculation errors */}
      {calculationError && (
        <div className="mt-2 p-2 bg-red-900/30 text-red-400 rounded-lg text-sm">
          {calculationError}
        </div>
      )}

      {/* Detail Section */}
      {buyAmount > 0 &&
        sellAmount > 0 &&
        selectedTokenFrom &&
        selectedTokenTo && (
          <DetailSection
            sellAmount={`${swap ? buyAmount : sellAmount}`}
            buyAmount={`${swap ? sellAmount : buyAmount}`}
            inValidAmount={invaliSelldAmount || invalidBuyAmount}
            reserves={reserveData}
            dexFee={getDexFee()}
          />
        )}

      <div className="w-full my-[30px]">
        {isConnected ? (
          <Button
            text="Swap"
            theme="gradient"
            onClick={() => addToast(<NotifiSwapStream />)}
            error={invaliSelldAmount || invalidBuyAmount || !!calculationError}
            disabled={
              !selectedTokenFrom || !selectedTokenTo || !!calculationError
            }
          />
        ) : (
          <Button
            text="Connect Wallet"
            error={invaliSelldAmount || invalidBuyAmount}
          />
        )}
      </div>
    </div>
  )
}

const SettingButton = () => {
  return (
    <div className="group w-8 h-8 bg-white hover:bg-tabsGradient bg-opacity-[12%] rounded-[12px] flex items-center justify-center cursor-pointer">
      <Image
        src="/icons/settings.svg"
        alt="settings"
        className="w-fit h-fit block group-hover:hidden"
        width={40}
        height={40}
      />
      <Image
        src="/icons/settings-primary.svg"
        alt="settings"
        className="w-fit h-fit hidden group-hover:block"
        width={40}
        height={40}
      />
    </div>
  )
}

export default SELSection
