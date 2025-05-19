'use client'

import { SEL_SECTION_TABS } from '@/app/lib/constants'
import { useToast } from '@/app/lib/context/toastProvider'
import { isNumberValid } from '@/app/lib/helper'
import Image from 'next/image'
import { useEffect, useState, useRef, useCallback } from 'react'
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
import { motion, useAnimation, Variants } from 'framer-motion'
import { ChevronDown, RefreshCcw } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import AdvancedConfig from '../advancedConfig'
import TradingSettings from './TradeSettings'

const SELSection = () => {
  const [activeTab, setActiveTab] = useState(SEL_SECTION_TABS[0])
  const [sellAmount, setSellAmount] = useState(0)
  const [buyAmount, setBuyAmount] = useState(0)
  const [invaliSelldAmount, setInvalidSellAmount] = useState(false)
  const [invalidBuyAmount, setInvalidBuyAmount] = useState(false)
  const [swap, setSwap] = useState(false)
  const [dexCalculator, setDexCalculator] = useState<DexCalculator | null>(null)
  const [reserveData, setReserveData] = useState<ReserveData | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [calculationError, setCalculationError] = useState<string | null>(null)
  const [isFetchingReserves, setIsFetchingReserves] = useState(false)

  // Timer related states
  const [timerActive, setTimerActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(15) // 15 seconds
  const TIMER_DURATION = 30 // constant for reset
  const { addToast } = useToast()
  const { selectedTokenFrom, selectedTokenTo } = useModal()
  const { address, isConnected } = useAppKitAccount()
  // Add a ref to track when we're resetting values to zero
  const isClearingValuesRef = useRef<boolean>(false)
  // Timer interval ref
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Get current chain from AppKit
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]
  const pathname = usePathname()
  const router = useRouter()

  // Preload the token list when the component mounts
  const { tokens, isLoading } = useTokenList()

  // Function to fetch reserves that can be called from multiple places
  const fetchReserves = useCallback(async () => {
    console.log('Fetching reserves')
    setCalculationError(null)
    setIsFetchingReserves(true)

    if (selectedTokenFrom && selectedTokenTo) {
      try {
        // Check if tokens have addresses
        const fromAddress =
          selectedTokenFrom.token_address ||
          '0xdAC17F958D2ee523a2206206994597C13D831ec7' // Default to USDT if no address
        const toAddress =
          selectedTokenTo.token_address ||
          '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' // Default to UNI if no address

        // Fetch reserves from the backend API
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${fromAddress}&tokenB=${toAddress}`
        )

        console.log('Reserve API response ===>', response)

        if (!response.ok) {
          throw new Error('Failed to fetch reserves')
        }

        const data = await response.json()
        console.log('Reserves data:', data)

        // Check if we received valid data
        if (!data) {
          setCalculationError('No liquidity data received')
          setReserveData(null)
          setDexCalculator(null)
          setIsFetchingReserves(false)
          return
        }

        // Process the single object response
        console.log('Processing reserve data:', data)

        // Add decimals to the reserve data
        const reserveDataWithDecimals = {
          ...data,
          // token0Decimals: selectedTokenFrom.decimals || 18,
          // token1Decimals: selectedTokenTo.decimals || 18,
          token0Decimals: data.decimals.token0 || 18,
          token1Decimals: data.decimals.token1 || 18,
          token0Address: selectedTokenFrom.token_address || '',
          token1Address: selectedTokenTo.token_address || '',
        } as ReserveData

        setReserveData(reserveDataWithDecimals)

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
      } catch (error) {
        console.error('Error fetching reserves:', error)
        setCalculationError('Error fetching liquidity data')
        setReserveData(null)
        setDexCalculator(null)
      } finally {
        setIsFetchingReserves(false)
      }
    } else {
      setReserveData(null)
      setDexCalculator(null)
      setIsFetchingReserves(false)
    }
  }, [selectedTokenFrom, selectedTokenTo, chainId])

  // Reset sell amount when tokens change
  useEffect(() => {
    if (sellAmount > 0) {
      console.log('Tokens changed, resetting sell amount to 0')
      setSellAmount(0)
      setBuyAmount(0)
    }
  }, [selectedTokenFrom, selectedTokenTo])

  // Fetch reserves only when tokens change or chain changes
  useEffect(() => {
    fetchReserves()
  }, [fetchReserves])

  // Timer logic
  useEffect(() => {
    // Start or reset timer when sell amount changes and both tokens are selected
    if (sellAmount > 0 && selectedTokenFrom && selectedTokenTo) {
      // Reset timer
      setTimeRemaining(TIMER_DURATION)
      setTimerActive(true)

      // Clear any existing interval
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }

      // Set up new interval
      timerIntervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Time's up, refetch reserves
            fetchReserves()
            return TIMER_DURATION // Reset timer
          }
          return prev - 1
        })
      }, 1000)
    } else {
      // No sell amount or missing tokens, stop timer
      setTimerActive(false)
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    // Cleanup interval on unmount
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [sellAmount, selectedTokenFrom, selectedTokenTo, fetchReserves])

  // Simplified calculation logic - always calculate when sell amount changes
  useEffect(() => {
    // Skip calculation if we don't have required data
    if (!dexCalculator || !reserveData) {
      console.log('Missing calculator or reserve data, skipping calculation')
      return
    }

    // Don't calculate if there's no amount to calculate with
    if (sellAmount <= 0) {
      console.log('No sell amount to calculate with')
      // Clear buy amount if sell amount is zero
      if (sellAmount === 0 && buyAmount !== 0) {
        setBuyAmount(0)
      }
      return
    }

    // Check if we're in the process of clearing values
    if (isClearingValuesRef.current) {
      console.log('Clearing values in progress, skipping calculation')
      return
    }

    // Proceed with calculation
    const calculateBuyAmount = async () => {
      // Special handling for value = 1 with SushiSwap
      const isInputOne = sellAmount === 1 || sellAmount.toString() === '1'

      try {
        setIsCalculating(true)
        setCalculationError(null)

        console.log('Calculating output amount with:', {
          sellAmount: sellAmount.toString(),
          reserveData,
        })

        const calculatedBuyAmount = await dexCalculator.calculateOutputAmount(
          sellAmount.toString(),
          reserveData
        )

        console.log(
          'Calculation result for sell =',
          sellAmount,
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
      }
    }

    // Always run the calculation when sell amount changes
    calculateBuyAmount()
  }, [sellAmount, reserveData, dexCalculator])

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

  // Simplified swap handler
  const handleSwap = () => {
    if (sellAmount > 0 || buyAmount > 0) {
      // When swapping, set the sell amount to the current buy amount
      setSellAmount(buyAmount)
      setBuyAmount(0) // Clear buy amount, it will be recalculated
      setSwap(!swap)
    }
  }

  // Simplified sell amount handler
  const handleSellAmountChange = (val: any) => {
    // Check if the value has actually changed to avoid unnecessary rerenders
    if (val === sellAmount) return

    console.log('Updating sell amount from:', sellAmount, 'to:', val)

    // If the value is zero, reset the buy amount as well
    if (val === 0 || val === '0' || val === '') {
      console.log('Sell amount is zero, resetting buy amount')
      // Set flag that we're clearing values to prevent calculation loops
      isClearingValuesRef.current = true
      setSellAmount(0)
      setBuyAmount(0)
      setCalculationError(null) // Clear any calculation errors

      // Reset flag after a delay to allow state to settle
      setTimeout(() => {
        isClearingValuesRef.current = false
      }, 100)
      return
    }

    // Update the sell amount - this will trigger the calculation useEffect
    setSellAmount(val)
  }

  // Simplified buy amount handler - just updates the state without triggering calculations
  const handleBuyAmountChange = (val: any) => {
    // Buy field is read-only in this implementation, but we keep the handler for compatibility
    console.log('Buy field is read-only in one-way calculation mode')
    return
  }

  const controls = useAnimation()

  // Add this useEffect to start the animation when component mounts
  useEffect(() => {
    controls.start('visible')
  }, [controls])

  // Animation variants
  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: 0.2,
      },
    },
  }

  // Animation variants
  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: 'easeOut',
        delay: 0, // Appear after logo
      },
    },
  }

  return (
    <div className="w-full flex flex-col justify-center items-center">
      <motion.h1
        className="text-4xl md:text-6xl font-bold mb-10 sm:mb-16 text-white"
        initial="hidden"
        animate={controls}
        variants={titleVariants}
      >
        Swap anytime, anywhere
      </motion.h1>
      <motion.div
        className="md:min-w-[500px] max-w-[500px] w-[95vw] p-2"
        initial="hidden"
        animate={controls}
        variants={containerVariants}
      >
        <div className="w-full flex justify-end gap-2 mb-4">
          {/* <div className="w-fit">
            <Tabs
              tabs={SEL_SECTION_TABS}
              theme="secondary"
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </div> */}

          {/* setting button */}
          <div className="flex items-center gap-2">
            {/* Reload Timer */}
            {timerActive && (
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2 bg-white hover:bg-tabsGradient bg-opacity-[12%] px-2 py-1 rounded-full">
                  <div className="text-sm text-white/70">Auto refresh in</div>
                  <div className="relative w-6 h-6">
                    {/* Circular timer animation */}
                    <svg className="w-6 h-6 transform -rotate-90">
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        className="text-white/10"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="transparent"
                        strokeDasharray="62.83" // 2 * PI * r (where r=10)
                        strokeDashoffset={
                          62.83 * (1 - timeRemaining / TIMER_DURATION)
                        }
                        className="text-primary transition-all duration-1000 ease-linear"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                      {timeRemaining}
                    </div>
                  </div>

                  {/* <RefreshCcw
                onClick={() => {
                  // Reset timer and fetch immediately
                  setTimeRemaining(TIMER_DURATION)
                  fetchReserves()
                }}
                className="w-4 h-4 ml-1 text-primary hover:text-primary/80 transition-colors"
              /> */}
                </div>
              </div>
            )}

            {/* <SettingButton /> */}
            <TradingSettings />
          </div>
        </div>

        {activeTab.title === 'Limit' && (
          <LimitSection
            active={false} // Always false since we only support sell-to-buy
            setActive={() => {}} // No-op function since we don't change this state
          />
        )}
        <div className="w-full mt-4 flex flex-col relative gap-[23px]">
          {swap ? (
            <CoinBuySection
              amount={buyAmount}
              setAmount={handleBuyAmountChange}
              inValidAmount={invalidBuyAmount}
              swap={swap}
              disabled={true} // Always disabled in swap mode
              isLoading={false} // Never loading in the top position
            />
          ) : (
            <CoinSellSection
              amount={sellAmount}
              setAmount={handleSellAmountChange}
              inValidAmount={invaliSelldAmount}
              disabled={isFetchingReserves}
            />
          )}
          <div
            onClick={handleSwap}
            className="absolute items-center flex border-[#1F1F1F] border-[2px] border-opacity-[1.5] bg-black justify-center cursor-pointer rounded-[6px] right-[calc(50%_-_42px)] top-[calc(50%_-_2.25rem)] md:top-[calc(50%_-_2rem)] rotate-45 z-50"
          >
            <div className="w-[25.3px] h-[22.8px] absolute bg-transparent md:bg-black -rotate-45 -z-30 -left-[14px] top-[50.8px]" />
            <div className="w-[26.4px] h-[22.8px] absolute bg-transparent md:bg-black -rotate-45 -z-30 -right-[11.8px] -top-[13.2px]" />
            <SwapBox active={sellAmount > 0 || buyAmount > 0} />
          </div>
          {swap ? (
            <CoinSellSection
              amount={sellAmount}
              setAmount={handleSellAmountChange}
              inValidAmount={invaliSelldAmount}
              swap={swap}
              disabled={isFetchingReserves}
            />
          ) : (
            <CoinBuySection
              amount={buyAmount}
              setAmount={handleBuyAmountChange}
              inValidAmount={invalidBuyAmount}
              swap={swap}
              disabled={true} // Always disabled since we only support sell-to-buy
              isLoading={isCalculating} // Show loading state when calculating
            />
          )}
        </div>

        {/* Error message for calculation errors */}
        {calculationError && (
          <div className="mt-2 p-2 bg-red-900/30 text-red-400 rounded-lg text-sm">
            {calculationError}
          </div>
        )}

        {/* Advanced Config */}
        {/* {buyAmount > 0 &&
          sellAmount > 0 &&
          selectedTokenFrom &&
          selectedTokenTo && <AdvancedConfig />} */}

        {/* Detail Section */}
        {buyAmount > 0 &&
          sellAmount > 0 &&
          selectedTokenFrom &&
          selectedTokenTo && (
            <>
              <DetailSection
                sellAmount={`${swap ? buyAmount : sellAmount}`}
                buyAmount={`${swap ? sellAmount : buyAmount}`}
                inValidAmount={invaliSelldAmount || invalidBuyAmount}
                reserves={reserveData}
              />
            </>
          )}

        <div className="w-full my-[20px]">
          {isConnected && pathname === '/swaps' ? (
            <Button
              text={isFetchingReserves ? 'Fetching reserves...' : 'Swap'}
              theme="gradient"
              onClick={() => addToast(<NotifiSwapStream />)}
              error={
                invaliSelldAmount || invalidBuyAmount || !!calculationError
              }
              disabled={
                !selectedTokenFrom ||
                !selectedTokenTo ||
                !!calculationError ||
                isFetchingReserves
              }
              loading={isFetchingReserves}
            />
          ) : (
            <Button
              text={
                pathname === '/'
                  ? isFetchingReserves
                    ? 'Fetching reserves...'
                    : 'Get Started'
                  : isFetchingReserves
                  ? 'Fetching reserves...'
                  : 'Connect Wallet'
              }
              error={invaliSelldAmount || invalidBuyAmount}
              onClick={() => {
                if (pathname === '/') {
                  router.push('/swaps')
                } else {
                  open()
                }
              }}
              disabled={isFetchingReserves}
              loading={isFetchingReserves}
            />
          )}
        </div>

        {/* Scroll to learn more text and icon */}
        {pathname === '/' && (
          <div className="flex flex-col items-center justify-center z-20">
            <motion.div
              className="flex flex-col items-center cursor-pointer"
              animate={{
                y: [0, -5, 0],
                color: [
                  'rgba(255,255,255,1)',
                  'rgba(156,163,175,0.7)',
                  'rgba(255,255,255,1)',
                ],
                textShadow: [
                  '0 0 5px rgba(255,255,255,0.5)',
                  '0 0 2px rgba(255,255,255,0.2)',
                  '0 0 5px rgba(255,255,255,0.5)',
                ],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'easeInOut',
              }}
              onClick={() => {
                window.scrollTo({
                  top: window.innerHeight,
                  behavior: 'smooth',
                })
              }}
            >
              <p className="text-center mb-1 text-lg font-medium tracking-wide">
                Explore our features
              </p>
              <ChevronDown
                size={28}
                strokeWidth={2}
                className="drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]"
              />
            </motion.div>
          </div>
        )}
      </motion.div>
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
