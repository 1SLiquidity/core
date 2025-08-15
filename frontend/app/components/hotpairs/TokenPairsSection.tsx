'use client'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Button from '../button'
import { useRouter } from 'next/navigation'
import { tokensList } from './pairs-data'
import { useState } from 'react'
import { X } from 'lucide-react'

export default function TokenPairsSection({
  selectedBaseToken,
  selectedOtherToken,
  setSelectedBaseToken,
  setSelectedOtherToken,
  clearAllSelectedTokens,
}: {
  selectedBaseToken: any
  selectedOtherToken: any
  setSelectedBaseToken: any
  setSelectedOtherToken: any
  clearAllSelectedTokens: () => void
}) {
  const router = useRouter()

  const baseTokensSymbol = ['USDT', 'USDC', 'WBTC', 'WETH']

  return (
    <div className="flex flex-col items-center w-full justify-center gap-8">
      <div className="flex items-center w-full justify-center gap-8">
        {/* Left Section: 2x2 Grid */}
        <div className="grid grid-cols-2 gap-4">
          {tokensList
            .filter((token) => baseTokensSymbol.includes(token.symbol))
            .map((token) => (
              <TokenIcon
                key={token.id}
                token={token}
                isBaseToken={true}
                selectedBaseToken={selectedBaseToken}
                selectedOtherToken={selectedOtherToken}
                setSelectedBaseToken={setSelectedBaseToken}
              />
            ))}
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] h-28 bg-green-500 rounded-full"></div>

        {/* Right Section: 4x2 Grid */}
        <div className="grid grid-cols-4 gap-4">
          {tokensList.map((token) => (
            <TokenIcon
              key={token.id}
              token={token}
              isBaseToken={false}
              selectedBaseToken={selectedBaseToken}
              selectedOtherToken={selectedOtherToken}
              setSelectedOtherToken={setSelectedOtherToken}
            />
          ))}
        </div>
      </div>

      {selectedBaseToken && selectedOtherToken && (
        <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex items-center">
          <div className="flex gap-[6px] items-center py-[6px] sm:py-[10px] px-[6px] sm:px-[9px] rounded-[8px]">
            <div className="flex items-center gap-4 justify-start">
              <div
                className={cn('flex items-center transition-all duration-300')}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10">
                  <Image
                    src={selectedBaseToken.icon}
                    alt="eth"
                    width={20}
                    height={20}
                    className="w-full h-full"
                  />
                </div>
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 transition-all duration-300'
                  )}
                >
                  <Image
                    src={selectedOtherToken.icon}
                    alt="dai"
                    width={20}
                    height={20}
                    className="w-full h-full"
                  />
                </div>
              </div>
              <h2 className="text-white text-xl font-semibold min-w-[8rem] text-left">
                {selectedBaseToken.symbol} / {selectedOtherToken.symbol}
              </h2>
            </div>
            <button
              className="hover:text-primary transition-colors"
              onClick={clearAllSelectedTokens}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function TokenIcon({
  token,
  isBaseToken,
  selectedBaseToken,
  selectedOtherToken,
  setSelectedBaseToken,
  setSelectedOtherToken,
}: {
  token: any
  isBaseToken?: boolean
  selectedBaseToken?: any
  selectedOtherToken?: any
  setSelectedBaseToken?: any
  setSelectedOtherToken?: any
}) {
  return (
    <div
      className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center border-4 border-neutral-700 transition-all duration-300 group hover:scale-110 overflow-hidden',
        (selectedBaseToken?.symbol === token.symbol && isBaseToken) ||
          (selectedOtherToken?.symbol === token.symbol && !isBaseToken)
          ? 'border-[#40f798] scale-110 border-2'
          : ''
      )}
      onClick={() => {
        if (isBaseToken) {
          if (
            (selectedOtherToken &&
              selectedOtherToken.symbol !== token.symbol) ||
            !selectedOtherToken
          ) {
            setSelectedBaseToken(token)
          }
        } else {
          if (selectedBaseToken && selectedBaseToken.symbol !== token.symbol) {
            setSelectedOtherToken(token)
          }
        }
      }}
    >
      <Image
        src={token.icon}
        alt={token.symbol}
        width={20}
        height={20}
        className={cn(
          'w-full h-full filter grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100',
          (selectedBaseToken?.symbol === token.symbol && isBaseToken) ||
            (selectedOtherToken?.symbol === token.symbol && !isBaseToken)
            ? 'grayscale-0 opacity-100'
            : ''
        )}
      />
    </div>
  )
}
