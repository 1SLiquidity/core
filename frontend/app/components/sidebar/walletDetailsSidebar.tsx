import { TOKENS, WALLET_TABS } from '@/app/lib/constants'
import { formatWalletAddress } from '@/app/lib/helper'
import { CHAIN_MAPPING } from '@/app/lib/moralis'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Sidebar from '.'
import StreamDetails from '../streamDetails'
import SwapStream from '../swapStream'
import Tabs from '../tabs'
import { useAppKitAccount, useAppKitState } from '@reown/appkit/react'
import { useWalletTokens, TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { calculateWalletBalance } from '@/app/lib/moralis'

type WalletDetailsSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

// Chain name mapping for display purposes
const CHAIN_NAMES: { [key: string]: string } = {
  '1': 'Ethereum',
  '42161': 'Arbitrum One',
  '137': 'Polygon',
  '56': 'BNB Chain',
  // Add more chains as needed
}

// Mapping from chain IDs to Moralis chain identifiers
const CHAIN_ID_TO_MORALIS: { [key: string]: string } = {
  '1': 'eth',
  '42161': 'arbitrum',
  '137': 'polygon',
  '56': 'bsc',
  // Add more chains as needed
}

const WalletDetailsSidebar: React.FC<WalletDetailsSidebarProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState(WALLET_TABS[0])
  const [isStreamDetailsOpen, setIsStreamDetailsOpen] = useState(false)
  const [totalBalance, setTotalBalance] = useState<number | null>(null)
  // Track average percentage change across tokens
  const [averagePercentChange, setAveragePercentChange] = useState<
    number | null
  >(null)
  const [dayChange, setDayChange] = useState<number | null>(null)

  const { address, isConnected, caipAddress, status, embeddedWalletInfo } =
    useAppKitAccount()

  // Get current chain from AppKit
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]

  // Map chainId to Moralis chain format
  const moralisChain = CHAIN_ID_TO_MORALIS[chainId] || 'eth'
  const chainName = CHAIN_NAMES[chainId] || moralisChain

  // Use the Moralis hook with React Query to fetch wallet tokens for the selected chain
  const {
    tokens: walletTokens,
    rawTokens,
    isLoading: isLoadingTokens,
    error: tokensError,
    refetch,
    isFetching,
  } = useWalletTokens(address, moralisChain)

  // Calculate total balance whenever token data changes
  useEffect(() => {
    if (rawTokens.length > 0 && !tokensError) {
      const balance = calculateWalletBalance(rawTokens)
      setTotalBalance(balance)

      // Calculate average percentage change
      let totalPercentChange = 0
      let tokensWithPriceData = 0

      rawTokens.forEach((token) => {
        if (token.usd_price && token.statusAmount !== undefined) {
          totalPercentChange +=
            token.statusAmount * (token.status === 'decrease' ? -1 : 1)
          tokensWithPriceData++
        }
      })

      if (tokensWithPriceData > 0) {
        const avgChange = totalPercentChange / tokensWithPriceData
        setAveragePercentChange(avgChange)

        // Calculate estimated $ change based on percentage
        const estimatedChange = balance * (avgChange / 100)
        setDayChange(estimatedChange)
      } else {
        setAveragePercentChange(null)
        setDayChange(null)
      }
    } else if (rawTokens.length === 0 && !isLoadingTokens && !tokensError) {
      // If we have no tokens but the query completed successfully, set balance to 0
      setTotalBalance(0)
      setAveragePercentChange(null)
      setDayChange(null)
    }
  }, [rawTokens, tokensError, isLoadingTokens])

  // Flag to determine if we're showing real tokens or fallback tokens
  const isShowingRealTokens = walletTokens.length > 0 && !tokensError

  // Display fallback tokens if there's an error or no tokens
  const displayTokens = isShowingRealTokens ? walletTokens : TOKENS

  console.log('Address ========>', address, isConnected)

  // Format currency for display
  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Handle manual refresh
  const handleRefresh = async () => {
    setTotalBalance(null)
    await refetch()
  }

  console.log('walletTokens', walletTokens)
  console.log('rawTokens', rawTokens)
  console.log('displayTokens', displayTokens)

  return (
    <Sidebar isOpen={isOpen} onClose={onClose}>
      {/* close icon */}
      <div
        onClick={onClose}
        className="bg-[#232624] cursor-pointer rounded-full p-2 absolute top-6 -left-3 z-50"
      >
        <Image
          src={'/icons/close.svg'}
          alt="close"
          className="w-2"
          width={1000}
          height={1000}
          onClick={onClose}
        />
      </div>

      {/* main content */}
      <div className="relative max-h-[88vh] overflow-hidden overflow-y-auto">
        {isStreamDetailsOpen ? (
          <>
            <StreamDetails
              onBack={() => setIsStreamDetailsOpen(false)}
              walletAddress={address || 'GY68234nasmd234asfKT21'}
            />
          </>
        ) : (
          <>
            <div className="flex justify-between gap-2 h-full sticky bg-black top-0 p-6 rounded-2xl z-40">
              <div className="flex gap-3 items-center">
                <div className="relative h-fit">
                  <Image
                    src={'/icons/token.svg'}
                    alt="coin"
                    className="w-8 h-8"
                    width={1000}
                    height={1000}
                  />
                  <Image
                    src="/icons/token-icon.svg"
                    alt="token symbol"
                    className="w-4 h-4 absolute bottom-0 right-0"
                    width={200}
                    height={200}
                  />
                </div>
                <p className="text-white">
                  {formatWalletAddress(address || 'GY68234nasmd234asfKT21')}
                </p>
              </div>
              <Image
                src={'/icons/switchoff.svg'}
                alt="close"
                className="w-6 cursor-pointer"
                width={1000}
                height={1000}
                onClick={onClose}
              />
            </div>

            {/* Chain Indicator */}
            <div className="px-6 mt-4 flex justify-between items-center">
              <div className="flex items-center">
                <div className="text-sm text-white px-2 py-1 bg-neutral-800 rounded-full flex items-center">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                  {chainName}
                </div>
              </div>
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isLoadingTokens || isFetching}
                className="flex items-center gap-1 text-sm text-white hover:text-white p-2 bg-white005 rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Image
                  src={'/icons/refresh.svg'}
                  alt="refresh"
                  className={`w-4 h-4 text-white ${
                    isFetching ? 'animate-spin' : ''
                  }`}
                  width={16}
                  height={16}
                />
                Refresh
              </button>
            </div>

            {/* wallet amount details */}
            <div className="px-6 pb-6">
              <div className="mt-4">
                {isLoadingTokens || isFetching ? (
                  <p className="text-[24px] font-bold">Loading balance...</p>
                ) : tokensError ? (
                  <p className="text-[24px] font-bold text-primaryRed">
                    Error loading balance
                  </p>
                ) : (
                  <p className="text-[36px] font-bold">
                    {formatCurrency(totalBalance)}
                  </p>
                )}
                {/* progress */}
                <div className="flex gap-1.5 text-white text-[14px]">
                  {averagePercentChange !== null && dayChange !== null ? (
                    <>
                      <Image
                        src={
                          averagePercentChange >= 0
                            ? '/icons/progress-up.svg'
                            : '/icons/progress-down.svg'
                        }
                        alt="progress"
                        className="w-2.5"
                        width={1000}
                        height={1000}
                      />
                      <p
                        className={
                          averagePercentChange >= 0
                            ? 'text-primary'
                            : 'text-primaryRed'
                        }
                      >
                        {formatCurrency(Math.abs(dayChange || 0))} (
                        {Math.abs(averagePercentChange).toFixed(2)}%)
                      </p>
                      <p>Today</p>
                    </>
                  ) : (
                    <p>No price change data available</p>
                  )}
                </div>
              </div>

              {/* LP Positions */}
              <div className="mt-7 bg-white005 py-4 px-3.5 rounded-[15px]">
                <div className="flex text-white gap-1 items-center">
                  <p className="">LP Positions</p>
                  <Image
                    src={'/icons/right-arrow.svg'}
                    alt="arrow-lp"
                    className="w-3 mt-1"
                    width={1000}
                    height={1000}
                  />
                </div>
                <p className="text-[20px]">$999,999.99</p>
                <div className="flex gap-1 text-white">
                  <p className="">Reward: </p>
                  <p className="">$22.39 </p>
                </div>
              </div>

              {/* tabs */}
              <div className="mt-[34px] w-full">
                <Tabs
                  tabs={WALLET_TABS}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  tabHeight={32}
                  theme="secondary"
                />
              </div>

              {/* ongoing streams */}
              {activeTab == WALLET_TABS[0] ? (
                <div>
                  <div className="mt-4">
                    <p className="text-[20px]">Ongoing Streams</p>
                    <div className="flex flex-col gap-2.5 mt-4">
                      <SwapStream
                        onClick={() => setIsStreamDetailsOpen(true)}
                      />
                      <SwapStream
                        onClick={() => setIsStreamDetailsOpen(true)}
                      />
                    </div>
                  </div>

                  {/* Past Streams */}
                  <div className="mt-4">
                    <p className="text-[20px]">Past Streams</p>
                    {/* ongoing streams */}
                    <div className="flex flex-col gap-2.5 mt-4">
                      <SwapStream
                        onClick={() => setIsStreamDetailsOpen(true)}
                        limit={true}
                        limitContent={'1 ETH = 0.1111545 USDC'}
                      />
                      <SwapStream
                        onClick={() => setIsStreamDetailsOpen(true)}
                        limit={true}
                        limitContent={'1 ETH = 0.1111545 USDC'}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 my-[13px]">
                  {isLoadingTokens || isFetching ? (
                    <div className="text-center p-4">
                      {isFetching
                        ? 'Refreshing tokens...'
                        : 'Loading tokens...'}
                    </div>
                  ) : tokensError ? (
                    <div className="text-center p-4 text-primaryRed">
                      Error loading tokens: {tokensError.message}
                    </div>
                  ) : walletTokens.length === 0 ? (
                    <div className="text-center p-4 text-white">
                      No tokens found on {chainName}
                    </div>
                  ) : (
                    displayTokens
                      .map((token, ind) => {
                        // Skip tokens with no price data or insufficient liquidity
                        if (!isShowingRealTokens && ind > 5) {
                          return null // Limit fallback tokens to 5
                        }

                        // Only show tokens that have price data or are native tokens
                        const hasValidPriceData =
                          ((token as TOKENS_TYPE)?.usd_price ?? 0) > 0 ||
                          ((token as TOKENS_TYPE)?.token_address ?? '') ===
                            '0x0000000000000000000000000000000000000000' ||
                          parseFloat((token as TOKENS_TYPE)?.balance ?? '0') > 0 // Show tokens with balance

                        if (isShowingRealTokens && !hasValidPriceData) {
                          return null
                        }

                        return (
                          <div
                            key={ind}
                            className="w-full flex items-center justify-between border border-white14 bg-white005 hover:bg-neutral-800 p-4 rounded-[15px] cursor-pointer"
                          >
                            <div className="flex gap-[12px]">
                              <div className="relative h-fit">
                                <Image
                                  src={token.icon}
                                  alt={token.name}
                                  className="w-[40px] h-[40px]"
                                  width={1000}
                                  height={1000}
                                />
                              </div>
                              <div>
                                <p className="text-[18px] p-0 leading-tight">
                                  {token.symbol}
                                </p>
                                <p className="text-[14px] uppercase text-gray p-0 leading-tight">
                                  {typeof token.value === 'number'
                                    ? token.value.toFixed(6)
                                    : (
                                        parseFloat(
                                          (token as TOKENS_TYPE)?.balance ?? '0'
                                        ) /
                                        Math.pow(
                                          10,
                                          (token as TOKENS_TYPE)?.decimals ?? 18
                                        )
                                      ).toFixed(6)}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              {isShowingRealTokens &&
                              'usd_price' in token &&
                              ((token as TOKENS_TYPE)?.usd_price ?? 0) > 0 ? (
                                <p
                                  className={`text-[16px] p-0 leading-tight ${
                                    token.status == 'increase'
                                      ? 'text-primary'
                                      : 'text-primaryRed'
                                  }`}
                                >
                                  {`${token.status == 'increase' ? '+' : '-'}${(
                                    token.statusAmount || 0
                                  ).toFixed(2)}`}
                                </p>
                              ) : (
                                <p className="text-[16px] p-0 leading-tight text-white text-right">
                                  {'token_address' in token &&
                                  ((token as TOKENS_TYPE)?.token_address ??
                                    '') ===
                                    '0x0000000000000000000000000000000000000000'
                                    ? 'usd_price' in token &&
                                      ((token as TOKENS_TYPE)?.usd_price ?? 0) >
                                        0
                                      ? `${
                                          token.status == 'increase' ? '+' : '-'
                                        }${(token.statusAmount || 0).toFixed(
                                          2
                                        )}`
                                      : 'Native token'
                                    : parseFloat(
                                        (token as TOKENS_TYPE)?.balance ?? '0'
                                      ) > 0
                                    ? `Balance: ${(
                                        parseFloat(
                                          (token as TOKENS_TYPE)?.balance ?? '0'
                                        ) /
                                        Math.pow(
                                          10,
                                          (token as TOKENS_TYPE)?.decimals ?? 18
                                        )
                                      ).toFixed(4)}`
                                    : 'No price data'}
                                </p>
                              )}
                              {isShowingRealTokens &&
                              'usd_price' in token &&
                              ((token as TOKENS_TYPE)?.usd_price ?? 0) > 0 ? (
                                <div className="flex gap-1 items-center">
                                  <Image
                                    src={
                                      token.status == 'increase'
                                        ? '/icons/progress-up.svg'
                                        : '/icons/progress-down.svg'
                                    }
                                    alt="progress"
                                    className="w-2"
                                    width={1000}
                                    height={1000}
                                  />
                                  <p className="text-[14px]">
                                    {`${(token.statusAmount || 0).toFixed(2)}%`}
                                  </p>
                                </div>
                              ) : (
                                <div className="flex gap-1 items-center">
                                  <p className="text-[14px] text-white text-right">
                                    {'token_address' in token &&
                                    ((token as TOKENS_TYPE)?.token_address ??
                                      '') ===
                                      '0x0000000000000000000000000000000000000000' ? (
                                      'usd_price' in token &&
                                      ((token as TOKENS_TYPE)?.usd_price ?? 0) >
                                        0 ? (
                                        <span className="flex gap-1 items-center">
                                          <Image
                                            src={
                                              token.status == 'increase'
                                                ? '/icons/progress-up.svg'
                                                : '/icons/progress-down.svg'
                                            }
                                            alt="progress"
                                            className="w-2"
                                            width={1000}
                                            height={1000}
                                          />
                                          {`${(token.statusAmount || 0).toFixed(
                                            2
                                          )}%`}
                                        </span>
                                      ) : (
                                        'Native token'
                                      )
                                    ) : token.symbol === 'ZONE' ? (
                                      'No price data available'
                                    ) : parseFloat(
                                        (token as TOKENS_TYPE)?.balance ?? '0'
                                      ) > 0 ? (
                                      'No price data'
                                    ) : isShowingRealTokens ? (
                                      'Insufficient liquidity'
                                    ) : (
                                      'Demo data'
                                    )}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                      .filter(Boolean) // Filter out null values
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Sidebar>
  )
}

export default WalletDetailsSidebar
