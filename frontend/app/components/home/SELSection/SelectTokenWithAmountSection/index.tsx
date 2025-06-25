import InputAmount from '@/app/components/inputAmount'
import { TOKENS } from '@/app/lib/constants'
import { useModal } from '@/app/lib/context/modalContext'
import { useSidebar } from '@/app/lib/context/sidebarContext'
import Image from 'next/image'
import { useState, useEffect, useMemo, useRef } from 'react'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { useAppKitAccount } from '@reown/appkit/react'
import { useWalletTokens } from '@/app/lib/hooks/useWalletTokens'
import { Skeleton } from '@/components/ui/skeleton'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { motion, AnimatePresence } from 'framer-motion'

interface InputAmountProps {
  amount: number
  setAmount: any
  inValidAmount?: boolean
  inputRef?: any
  inputField: 'from' | 'to'
  onInputFocus?: () => void
  disabled?: boolean
  isLoading?: boolean
}

// Top Tokens component that shows popular tokens on hover
const TopTokens = ({
  tokens,
  isVisible,
  onTokenSelect,
  selectedTokenFrom,
  selectedTokenTo,
  inputField,
}: {
  tokens: TOKENS_TYPE[]
  isVisible: boolean
  onTokenSelect: (token: TOKENS_TYPE) => void
  selectedTokenFrom: TOKENS_TYPE | null
  selectedTokenTo: TOKENS_TYPE | null
  inputField: 'from' | 'to'
}) => {
  // Get only 5 tokens, exclude STETH, and reverse the array to display from right to left
  const tokensToShow = [...tokens]
    .filter((token) => token.symbol.toLowerCase() !== 'steth')
    .slice(0, 5)
    .reverse()

  // Function to check if a token should be disabled
  const isTokenDisabled = (token: TOKENS_TYPE) => {
    if (inputField === 'from' && selectedTokenTo) {
      return token.token_address === selectedTokenTo.token_address
    }
    if (inputField === 'to' && selectedTokenFrom) {
      return token.token_address === selectedTokenFrom.token_address
    }
    return false
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute -top-[2.1rem] right-0 flex flex-row-reverse gap-1 items-center z-[100]"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
        >
          {tokensToShow.map((token: TOKENS_TYPE, index) => {
            const disabled = isTokenDisabled(token)
            return (
              <motion.div
                key={token.token_address || index}
                className={`cursor-pointer relative group ${
                  disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) {
                    onTokenSelect(token)
                  }
                }}
                whileHover={{ scale: disabled ? 1 : 1.1 }}
              >
                <div
                  className={`w-8 h-8 rounded-full overflow-hidden border border-neutral-700 bg-[#111] shadow-lg ${
                    disabled ? 'grayscale' : ''
                  }`}
                >
                  <Image
                    src={token.icon || '/icons/default-token.svg'}
                    alt={token.name || ''}
                    width={32}
                    height={32}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/icons/default-token.svg'
                    }}
                  />
                </div>
                {/* {disabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full">
                    <span className="text-[6px] text-white">Selected</span>
                  </div>
                )} */}
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const SelectTokenWithAmountSection: React.FC<InputAmountProps> = ({
  amount,
  setAmount,
  inValidAmount,
  inputRef,
  inputField,
  onInputFocus,
  disabled,
  isLoading,
}) => {
  const {
    showSelectTokenModal,
    selectedTokenFrom,
    selectedTokenTo,
    setSelectedTokenFrom,
    setSelectedTokenTo,
  } = useModal()
  const { address, isConnected } = useAppKitAccount()

  // Get user's wallet tokens - always use 'arbitrum' chain for this project
  const {
    tokens: walletTokens,
    isLoading: isLoadingTokens,
    rawTokens,
  } = useWalletTokens(address, 'arbitrum')

  // Get token list from useTokenList hook
  const { tokens: allTokens, isLoading: isLoadingTokenList } = useTokenList()

  const [showTooltip, setShowTooltip] = useState(false)
  const [tokenBalance, setTokenBalance] = useState('0')
  const [showTopTokens, setShowTopTokens] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  // Get the appropriate token based on which input field this is
  const selectedToken =
    inputField === 'from' ? selectedTokenFrom : selectedTokenTo

  // Get the token from the other section to filter it out
  const otherSectionToken =
    inputField === 'from' ? selectedTokenTo : selectedTokenFrom

  // Get top tokens sorted by popularity or market cap
  const topTokens = useMemo(() => {
    if (!allTokens || allTokens.length === 0) return []

    // Find WETH first
    const weth = allTokens.find(
      (token: TOKENS_TYPE) => token.symbol.toLowerCase() === 'weth'
    )

    // Filter out STETH but keep selected tokens
    const filteredTokens = allTokens.filter((token: TOKENS_TYPE) => {
      // Skip STETH
      if (token.symbol.toLowerCase() === 'steth') {
        return false
      }
      // Skip WETH as we'll add it separately
      if (token.symbol.toLowerCase() === 'weth') {
        return false
      }
      return true
    })

    // First try to find the popular tokens
    const popular = filteredTokens.filter((token: TOKENS_TYPE) => token.popular)

    // If we have WETH, add it at the start of the list
    const topTokensList = weth ? [weth, ...popular] : popular

    if (topTokensList.length >= 5) {
      return topTokensList.slice(0, 5)
    }

    // If not enough popular tokens, sort by market cap (using usd_price as a proxy)
    const byMarketCap = [...filteredTokens].sort(
      (a: TOKENS_TYPE, b: TOKENS_TYPE) =>
        (b.usd_price || 0) - (a.usd_price || 0)
    )

    // Combine WETH with market cap sorted tokens
    const finalList = weth ? [weth, ...byMarketCap] : byMarketCap
    return finalList.slice(0, 5)
  }, [allTokens, selectedTokenFrom, selectedTokenTo])

  // Find matching wallet token when selected token changes
  const matchingWalletToken = useMemo(() => {
    if (!selectedToken || !walletTokens.length) return null

    // Case 1: Normal token match by address
    const addressMatch = walletTokens.find(
      (token) =>
        token.token_address &&
        selectedToken.token_address &&
        token.token_address.toLowerCase() ===
          selectedToken.token_address.toLowerCase()
    )

    if (addressMatch) return addressMatch

    // Case 2: ETH special handling
    if (
      selectedToken.symbol === 'ETH' ||
      selectedToken.token_address?.toLowerCase() ===
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    ) {
      return walletTokens.find(
        (token) =>
          token.token_address ===
            '0x0000000000000000000000000000000000000000' ||
          token.symbol === 'ETH'
      )
    }

    // Case 3: Symbol match as fallback (less reliable)
    return walletTokens.find(
      (token) =>
        token.symbol.toLowerCase() === selectedToken.symbol.toLowerCase()
    )
  }, [selectedToken, walletTokens])

  // Update token balance whenever matching wallet token changes
  useEffect(() => {
    if (matchingWalletToken) {
      const balance =
        parseFloat(matchingWalletToken.balance) /
        Math.pow(10, matchingWalletToken.decimals)
      setTokenBalance(balance.toFixed(6))
    } else {
      setTokenBalance('0')
    }
  }, [matchingWalletToken])

  // Handle token selection
  const handleSelectToken = () => {
    showSelectTokenModal(true, inputField)
  }

  // Handle quick token selection
  const handleQuickTokenSelect = (token: TOKENS_TYPE) => {
    if (inputField === 'from') {
      setSelectedTokenFrom(token)
    } else {
      setSelectedTokenTo(token)
    }
    setShowTopTokens(false)
  }

  // Handle token deselection
  const handleClearToken = () => {
    if (inputField === 'from') {
      setSelectedTokenFrom(null)
    } else {
      setSelectedTokenTo(null)
    }
  }

  // Get token balance - uses the pre-calculated state value for efficiency
  const getTokenBalance = () => {
    return parseFloat(tokenBalance).toFixed(4)
  }

  // Set the amount to the max available balance (for "sell" field only)
  const handleSetMaxAmount = () => {
    if (inputField === 'from' && selectedToken) {
      const maxBalance = parseFloat(tokenBalance)
      if (maxBalance > 0) {
        setAmount(maxBalance)
      }
    }
  }

  // Calculate token balance value in USD
  const getTokenBalanceUSD = () => {
    if (!selectedToken || !selectedToken.usd_price) return 0
    const balance = parseFloat(tokenBalance)
    return (balance * selectedToken.usd_price).toFixed(2)
  }

  // Format token price for display
  const formatTokenPrice = () => {
    if (!selectedToken || !selectedToken.usd_price) return '--'
    return `$${selectedToken.usd_price.toFixed(2)}`
  }

  // Check if MAX button should be shown
  const shouldShowMaxButton = () => {
    return (
      inputField === 'from' &&
      parseFloat(tokenBalance) > 0 &&
      !isLoadingTokens &&
      isConnected
    )
  }

  return (
    <div className="w-full">
      <div className="w-full flex gap-4 items-center justify-between mt-[12px]">
        {/* amount */}
        <div className="flex-1">
          <InputAmount
            inputRef={inputRef}
            amount={amount}
            inValidAmount={inValidAmount}
            setAmount={(val: any) => {
              setAmount(val)
            }}
            onInputFocus={onInputFocus}
            disable={disabled}
            isLoading={isLoading}
          />
        </div>

        {/* select token */}
        {selectedToken ? (
          <div
            className={`min-w-[165px] group w-fit h-12 rounded-[25px] p-[2px] ${
              amount > 0 && !inValidAmount
                ? ' bg-borderGradient'
                : 'bg-[#373D3F]'
            }`}
            ref={buttonRef}
          >
            <div
              className="min-w-[165px] overflow-hidden w-fit h-full bg-[#0D0D0D] group-hover:bg-tabsGradient transition-colors duration-300 p-2 gap-[14px] flex rounded-[25px] items-center justify-between cursor-pointer uppercase font-bold"
              onClick={handleSelectToken}
            >
              <div className="flex items-center w-fit h-fit">
                <div className="mr-2.5 relative">
                  <Image
                    src={selectedToken.icon || '/icons/token.svg'}
                    alt={selectedToken.name || ''}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      // If the token image fails to load, use a fallback
                      const target = e.target as HTMLImageElement
                      target.src = '/icons/default-token.svg'
                    }}
                  />
                </div>
                <p>{selectedToken.symbol || ''}</p>
              </div>
              <Image
                src="/icons/arrow-down-white.svg"
                alt="close"
                className="w-fit h-fit mr-4"
                width={20}
                height={20}
              />
            </div>

            {/* We don't show top tokens when a token is already selected */}
          </div>
        ) : (
          <div
            onClick={handleSelectToken}
            className="min-w-[165px] relative w-fit h-12 bg-primaryGradient hover:opacity-85 py-[13px] px-[20px] gap-[14px] flex rounded-[25px] items-center justify-between text-black cursor-pointer uppercase font-bold"
            onMouseEnter={() => setShowTopTokens(true)}
            onMouseLeave={() => setShowTopTokens(false)}
            ref={buttonRef}
          >
            <p>Select Token</p>
            <Image
              src="/icons/arrow-down-black.svg"
              alt="arrow-down"
              className="w-fit h-fit"
              width={20}
              height={20}
            />

            {/* Top tokens displayed on hover (only when no token is selected) */}
            <TopTokens
              tokens={topTokens}
              isVisible={
                showTopTokens && !isLoadingTokenList && topTokens.length > 0
              }
              onTokenSelect={handleQuickTokenSelect}
              selectedTokenFrom={selectedTokenFrom}
              selectedTokenTo={selectedTokenTo}
              inputField={inputField}
            />
          </div>
        )}
      </div>

      {/* bottom section */}
      <div className="mt-2 w-full flex justify-between gap-3 items-center">
        {isLoading ? (
          <Skeleton className="h-4 w-10 mt-4" />
        ) : (
          <>
            <p
              className={`${
                inValidAmount ? 'text-primaryRed' : 'text-primary'
              }`}
            >
              {selectedToken && selectedToken.usd_price
                ? `$${(amount * selectedToken.usd_price).toFixed(2)}`
                : `$${amount}`}
            </p>
          </>
        )}

        <div className="flex gap-1.5 items-center">
          {selectedToken && (
            <>
              <Image
                src={'/icons/wallet.svg'}
                alt="price"
                className="w-4 h-4"
                width={16}
                height={16}
              />
              <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
              >
                {isLoadingTokens ? (
                  <p className="text-white flex items-center">
                    <span className="inline-block w-3 h-3 border-t-2 border-primary animate-spin rounded-full mr-1"></span>
                    Loading...
                  </p>
                ) : (
                  <p className="text-white">{getTokenBalance()}</p>
                )}
                {showTooltip &&
                  parseFloat(getTokenBalance()) > 0 &&
                  selectedToken.usd_price > 0 && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
                      ≈ ${getTokenBalanceUSD()}
                    </div>
                  )}
              </div>
              <p className="uppercase text-white">{selectedToken.symbol}</p>

              {/* Max button - only visible for the "from" input and when balance > 0 */}
              {shouldShowMaxButton() && (
                <button
                  onClick={handleSetMaxAmount}
                  className="ml-1 text-xs bg-white005 hover:bg-neutral-800 text-primary px-2 py-0.5 rounded-md transition-colors"
                >
                  MAX
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SelectTokenWithAmountSection
