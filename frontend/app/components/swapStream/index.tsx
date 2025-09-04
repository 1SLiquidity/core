'use client'

import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
import React from 'react'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUnits } from 'viem'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { cn } from '@/lib/utils'
import { useStreamTime } from '@/app/lib/hooks/useStreamTime'
import ImageFallback from '@/app/shared/ImageFallback'

type Trade = {
  id: string
  amountIn: string
  amountRemaining: string
  minAmountOut: string
  tokenIn: string
  tokenOut: string
  isInstasettlable: boolean
  realisedAmountOut: string
  lastSweetSpot: string
  executions: any[]
}

type Props = {
  trade: Trade
  onClick?: (trade: Trade) => void
  isUser?: boolean
  isLoading?: boolean
}

const SwapStream: React.FC<Props> = ({ trade, onClick, isUser, isLoading }) => {
  const { tokens, isLoading: isLoadingTokens } = useTokenList()
  const estimatedTime = useStreamTime(Number(trade?.lastSweetSpot) || 0)

  console.log('estimatedTime', estimatedTime)

  // Find token information
  const tokenIn = tokens.find(
    (t: TOKENS_TYPE) =>
      t.token_address.toLowerCase() === trade.tokenIn.toLowerCase()
  )
  const tokenOut = tokens.find(
    (t: TOKENS_TYPE) =>
      t.token_address.toLowerCase() === trade.tokenOut.toLowerCase()
  )

  // Format amounts using token decimals
  const formattedAmountIn = tokenIn
    ? formatUnits(BigInt(trade.amountIn), tokenIn.decimals)
    : '0'
  const formattedMinAmountOut = tokenOut
    ? formatUnits(BigInt(trade.minAmountOut), tokenOut.decimals)
    : '0'

  if (isLoadingTokens) {
    return (
      <div className="w-full border border-white14 relative bg-white005 p-4 rounded-[15px]">
        <Skeleton className="h-[100px] w-full" />
      </div>
    )
  }

  return (
    <div
      className="w-full border border-white14 relative bg-white005 p-4 rounded-[15px] cursor-pointer hover:bg-tabsGradient transition-all duration-300"
      onClick={() => onClick?.(trade)}
    >
      <div className="flex mr-8 items-center gap-1.5 absolute top-4 left-2">
        <Image
          src="/icons/swap-stream.svg"
          width={24}
          height={24}
          alt="swapStream"
        />
      </div>

      {/* main content */}
      <div className="ml-[27px] flex flex-col">
        <div className="flex gap-[6px] items-center">
          <div className="flex items-center gap-1">
            {isLoading ? (
              <>
                <Skeleton className="w-[18px] h-[18px] rounded-full" />
                <Skeleton className="w-24 h-4" />
              </>
            ) : (
              <>
                <ImageFallback
                  src={
                    (tokenIn?.symbol.toLowerCase() === 'usdt'
                      ? '/tokens/usdt.svg'
                      : tokenIn?.icon) || '/icons/default-token.svg'
                  }
                  width={2400}
                  height={2400}
                  alt={tokenIn?.symbol || 'token'}
                  className="w-[18px] h-[18px]"
                />
                <p className="text-white uppercase">
                  {formattedAmountIn} {tokenIn?.symbol}
                </p>
              </>
            )}
          </div>
          <Image
            src="/icons/right-arrow.svg"
            width={2400}
            height={2400}
            alt="swapStream"
            className="w-[10px]"
          />
          <div className="flex items-center gap-1">
            {isLoading ? (
              <>
                <Skeleton className="w-[18px] h-[18px] rounded-full" />
                <Skeleton className="w-24 h-4" />
              </>
            ) : (
              <>
                <ImageFallback
                  src={
                    (tokenOut?.symbol.toLowerCase() === 'usdt'
                      ? '/tokens/usdt.svg'
                      : tokenOut?.icon) || '/icons/default-token.svg'
                  }
                  width={2400}
                  height={2400}
                  alt={tokenOut?.symbol || 'token'}
                  className="w-[18px] h-[18px]"
                />
                <p className="text-white uppercase">
                  {formattedMinAmountOut} {tokenOut?.symbol} (EST)
                </p>
              </>
            )}
          </div>
        </div>

        <div className="w-full h-[3px] bg-white005 mt-[12px] relative">
          {isLoading ? (
            <Skeleton className="h-[3px] w-1/4 absolute top-0 left-0" />
          ) : (
            <div
              className="h-[3px] bg-primary absolute top-0 left-0"
              style={{
                width: `${
                  (trade.executions.length / Number(trade.lastSweetSpot)) * 100
                }%`, // Hardcoded for now as requested
              }}
            />
          )}
        </div>

        <div
          className={cn(
            'flex justify-between items-center gap-2 text-white52',
            isLoading ? 'mt-3.5' : 'mt-1.5'
          )}
        >
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </>
          ) : (
            <>
              <p className="">
                {/* 25/100 completed {/* Hardcoded as requested */}
                {trade.executions.length} / {trade.lastSweetSpot} completed
              </p>
              <div className="flex gap-2">
                <div className="flex items-center">
                  <Image
                    src="/icons/time.svg"
                    alt="clock"
                    className="w-5"
                    width={20}
                    height={20}
                  />
                  <p>{estimatedTime || '..'}</p>
                </div>
                {trade.isInstasettlable && (
                  <div className="flex items-center text-sm gap-1 bg-zinc-900 pl-1 pr-1.5 text-primary rounded-full leading-none">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 sm:w-5 sm:h-5"
                    >
                      <path
                        d="M13 2L6 14H11V22L18 10H13V2Z"
                        fill="#40f798"
                        fillOpacity="0.72"
                      />
                    </svg>
                    <span className="text-xs sm:inline-block hidden">
                      Instasettle
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SwapStream
