'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Sidebar from '.'
import StreamDetails from '../streamDetails'
import SwapStream from '../swapStream'
import { cn } from '@/lib/utils'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { Skeleton } from '@/components/ui/skeleton'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'

type GlobalStreamSidebarProps = {
  isOpen: boolean
  onClose: () => void
  initialStream?: any // We'll type this properly later
  className?: string
}

const GlobalStreamSidebar: React.FC<GlobalStreamSidebarProps> = ({
  isOpen,
  onClose,
  initialStream,
  className,
}) => {
  const [isStreamSelected, setIsStreamSelected] = useState(false)
  const [selectedStream, setSelectedStream] = useState<any>(
    initialStream || null
  )

  // Fetch trades data
  const { trades, isLoading, error } = useTrades({
    first: 10,
    skip: 0,
  })

  // Fetch token list for price data
  const { tokens, isLoading: isLoadingTokens } = useTokenList()

  // Calculate total USD value of trades
  const calculateTotalTradesValue = () => {
    if (!trades || trades.length === 0 || !tokens || tokens.length === 0)
      return 0

    return trades.reduce((total, trade) => {
      const tokenIn = tokens.find(
        (t: TOKENS_TYPE) =>
          t.token_address.toLowerCase() === trade.tokenIn.toLowerCase()
      )

      if (!tokenIn) return total

      const formattedAmountIn = formatUnits(
        BigInt(trade.amountIn),
        tokenIn.decimals
      )
      const amountInUsd = Number(formattedAmountIn) * (tokenIn.usd_price || 0)

      return total + amountInUsd
    }, 0)
  }

  // Log trades data whenever it changes
  useEffect(() => {
    if (trades.length > 0) {
      console.log('Fetched trades:', trades)
    }
    if (error) {
      console.error('Error fetching trades:', error)
    }
  }, [trades, error])

  const totalTradesValue = calculateTotalTradesValue()

  return (
    <Sidebar isOpen={isOpen} onClose={onClose} className={className}>
      {/* close icon */}
      {!selectedStream && (
        <div
          onClick={onClose}
          className={cn(
            'bg-[#232624] cursor-pointer rounded-full p-2 absolute top-6 -left-[0.7rem] z-50',
            className
          )}
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
      )}

      {/* main content */}
      <div className="relative max-h-[90vh] overflow-hidden overflow-y-auto scroll-hidden">
        {selectedStream ? (
          <>
            <StreamDetails
              onBack={() => setSelectedStream(null)}
              selectedStream={selectedStream}
              walletAddress="GY68234nasmd234asfKT21"
              onClose={onClose}
            />
          </>
        ) : (
          <>
            <div className="flex justify-between gap-2 h-full sticky bg-black top-0 py-6 px-4 z-40">
              <>
                <div className="flex gap-3 items-center">
                  <div className="relative cursor-pointer w-10 h-10 rounded-full flex items-center justify-center border-primary border-[2px]">
                    <Image
                      src="/icons/live-statistics.svg"
                      alt="logo"
                      className="w-6 h-6"
                      width={40}
                      height={40}
                    />
                    <div className="absolute w-[24px] h-[12px] bg-primaryRed -bottom-1.5 text-xs font-semibold uppercase flex items-center justify-center rounded-[2px]">
                      LIVE
                    </div>
                  </div>
                  <p className="text-white text-[20px]">Global Stream</p>
                </div>
              </>
            </div>

            <div className="pb-6 mt-4">
              <div className="p-4 rounded-[15px] bg-white005">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col leading-tight gap-0.5 items-start">
                    <p className="text-white text-xl">Ongoing</p>
                    {isLoading || isLoadingTokens ? (
                      <>
                        <Skeleton className="h-6 w-16 mt-1" />
                        <Skeleton className="h-4 w-24 mt-2" />
                      </>
                    ) : (
                      <>
                        <p className="text-[20px]">{trades.length}</p>
                        <p className="text-white52 text-[14px]">
                          $
                          {totalTradesValue.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-[20px] pb-3.5">Global Streams</p>

                <div className="flex flex-col gap-2">
                  {!isLoading && trades.length === 0 ? (
                    <div className="text-white52 text-center py-8">
                      No trades found
                    </div>
                  ) : (
                    <>
                      {trades.map((trade, index) => (
                        <SwapStream
                          key={index}
                          onClick={() => {
                            setIsStreamSelected(true)
                            setSelectedStream(trade)
                          }}
                          trade={trade}
                          isLoading={isLoading}
                        />
                      ))}
                      {isLoading &&
                        Array(10)
                          .fill(0)
                          .map((_, index) => (
                            <SwapStream
                              key={`skeleton-${index}`}
                              trade={{
                                id: '',
                                lastSweetSpot: '',
                                amountIn: '0',
                                amountRemaining: '0',
                                minAmountOut: '0',
                                tokenIn: '',
                                tokenOut: '',
                                isInstasettlable: false,
                                realisedAmountOut: '0',
                                executions: [],
                              }}
                              isLoading={true}
                            />
                          ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Sidebar>
  )
}

export default GlobalStreamSidebar
