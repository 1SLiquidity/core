'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useModal } from '@/app/lib/context/modalContext'
import { cn } from '@/lib/utils'
import { useScreenSize } from '@/app/lib/hooks/useScreenSize'

// Mock token data
const tokens = [
  { id: 1, name: 'Bitcoin', symbol: 'BTC', icon: '₿' },
  { id: 2, name: 'Ethereum', symbol: 'ETH', icon: 'Ξ' },
  { id: 3, name: 'Solana', symbol: 'SOL', icon: '◎' },
  { id: 4, name: 'Cardano', symbol: 'ADA', icon: '₳' },
  { id: 5, name: 'Polygon', symbol: 'MATIC', icon: '⬟' },
]

const defaultBoltConfig = {
  height: '7.5rem',
  color: '#020408',
  outerBorderStrokeWidth: '5',
  outerBorderStrokeColor: '#262626',
  innerBorderStrokeWidth: '1',
  innerBorderStrokeColor: '#020408',
  innerBorderFillColor: '#020408',
}

export default function TokenSelector() {
  const [fromToken, setFromToken] = useState<(typeof tokens)[0] | null>(null)
  const [toToken, setToToken] = useState<(typeof tokens)[0] | null>(null)
  const [boltConfig, setBoltConfig] = useState(defaultBoltConfig)
  const { isMobile, isTablet, isDesktop, screenType } = useScreenSize()

  const bothTokensSelected = fromToken && toToken
  const {
    showSelectTokenModal,
    selectedTokenFrom,
    selectedTokenTo,
    setSelectedTokenFrom,
    setSelectedTokenTo,
  } = useModal()

  useEffect(() => {
    if (selectedTokenFrom && selectedTokenTo) {
      setBoltConfig({
        ...defaultBoltConfig,
        color: '#33F498',
        outerBorderStrokeColor: '#40f798',
        height: '6.8rem',
        innerBorderStrokeWidth: '2',
        innerBorderStrokeColor: '#020408',
        innerBorderFillColor: '#020408',
      })
    } else {
      setBoltConfig(defaultBoltConfig)
    }
  }, [selectedTokenFrom, selectedTokenTo])

  return (
    <div className="bg-gray-900 flex items-center justify-center p-4 relative mb-10">
      <div className={cn('flex items-center gap-0 w-full max-w-xl')}>
        {selectedTokenFrom && selectedTokenTo && (
          <Image
            src="/assets/left-strokes.svg"
            alt="valid"
            className={`h-full md:block hidden left-[6.5rem] absolute top-0 blink-animation`}
            width={100}
            height={100}
          />
        )}
        <div
          className={cn(
            'w-full min-h-[53px] md:min-h-[51px] rounded-l-[15px] p-[2px] relative -right-[2px]',
            selectedTokenFrom && selectedTokenTo
              ? 'bg-primary'
              : 'bg-neutral-800'
          )}
        >
          <div
            className={cn(
              'flex justify-center items-center w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-6 rounded-l-[13px]',
              selectedTokenFrom && selectedTokenTo
                ? 'bg-gradient-to-r from-[#071310] to-[#062118] dotsbg'
                : 'bg-[#0D0D0D]'
            )}
          >
            {selectedTokenFrom ? (
              <div
                className={cn(
                  'min-w-[120px] sm:min-w-[165px] max-sm:relative max-sm:right-[10px] group w-fit h-12 rounded-[25px] p-[2px]',
                  selectedTokenFrom ? 'bg-borderGradient' : 'bg-[#373D3F]'
                )}
              >
                <div
                  className="min-w-[120px] sm:min-w-[165px] overflow-hidden w-fit h-full bg-[#0D0D0D] group-hover:bg-tabsGradient transition-colors duration-300 p-2 gap-[14px] flex rounded-[25px] items-center justify-between cursor-pointer uppercase font-bold"
                  onClick={() => showSelectTokenModal(true, 'from')}
                >
                  <div className="flex items-center w-fit h-fit">
                    <div className="mr-2.5 relative">
                      <Image
                        src={selectedTokenFrom.icon || '/icons/token.svg'}
                        alt={selectedTokenFrom.name || ''}
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
                    <p>{selectedTokenFrom.symbol || ''}</p>
                  </div>
                  <Image
                    src="/icons/arrow-down-white.svg"
                    alt="close"
                    className="w-fit h-fit mr-0 sm:mr-4"
                    width={20}
                    height={20}
                  />
                </div>
              </div>
            ) : (
              <div
                className="min-w-[120px] sm:min-w-[165px] max-sm:right-[10px] relative w-fit h-12 bg-primaryGradient hover:opacity-85 py-[13px] px-[20px] gap-[14px] flex rounded-[25px] items-center justify-between text-black cursor-pointer uppercase font-bold"
                onClick={() => showSelectTokenModal(true, 'from')}
              >
                <p>{isMobile ? 'Token' : 'Select Token'}</p>
                <Image
                  src="/icons/arrow-down-black.svg"
                  alt="arrow-down"
                  className="w-fit h-fit"
                  width={20}
                  height={20}
                />
              </div>
            )}
          </div>
        </div>

        {/* Cover for top pin */}
        {(!selectedTokenFrom || !selectedTokenTo) && (
          <div
            className="absolute bg-[#020407] w-8 md:w-4 h-4 z-[51]"
            style={{
              left: '50.5%',
              transform: 'translateX(-50%)',
              top: '0',
            }}
          />
        )}
        {selectedTokenFrom && selectedTokenTo && (
          <div
            className="absolute bg-[#020407] w-8 md:w-4 h-4 z-[51]"
            style={{
              left: '50.5%',
              transform: 'translateX(-50%)',
              top: '0',
            }}
          />
        )}

        <svg
          width="37"
          height="114"
          viewBox="-4 -4 45 122"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-1/2 top-1/2 z-50 flex items-center justify-center"
          style={{
            transform: 'translate(-50%, -50%)',
            width: '3rem',
            height: boltConfig.height,
          }}
        >
          {/* Outermost border path */}
          <path
            d="M24.5681 1.18613C24.612 0.608638 23.8031 0.430899 23.6009 0.97364L0.733023 62.3743C0.61658 62.687 0.833176 63.0238 1.16596 63.0476L13.9898 63.9636C14.2697 63.9836 14.4783 64.2299 14.452 64.5092L9.85446 113.248C9.79994 113.826 10.6086 114.017 10.8184 113.476L36.4638 47.326C36.5851 47.0133 36.3701 46.6722 36.0356 46.6467L21.6898 45.5539C21.4145 45.533 21.2083 45.2928 21.2292 45.0174L24.5681 1.18613Z"
            fill="transparent"
            stroke={boltConfig.outerBorderStrokeColor}
            strokeWidth={boltConfig.outerBorderStrokeWidth}
          />

          {/* Middle padding path */}
          <path
            d="M24.5681 1.18613C24.612 0.608638 23.8031 0.430899 23.6009 0.97364L0.733023 62.3743C0.61658 62.687 0.833176 63.0238 1.16596 63.0476L13.9898 63.9636C14.2697 63.9836 14.4783 64.2299 14.452 64.5092L9.85446 113.248C9.79994 113.826 10.6086 114.017 10.8184 113.476L36.4638 47.326C36.5851 47.0133 36.3701 46.6722 36.0356 46.6467L21.6898 45.5539C21.4145 45.533 21.2083 45.2928 21.2292 45.0174L24.5681 1.18613Z"
            // fill="transparent"
            fill={boltConfig.innerBorderFillColor}
            stroke={boltConfig.innerBorderStrokeColor}
            strokeWidth={boltConfig.innerBorderStrokeWidth}
            strokeLinecap="round"
          />

          {/* Main lightning bolt */}
          <path
            d="M24.5681 1.18613C24.612 0.608638 23.8031 0.430899 23.6009 0.97364L0.733023 62.3743C0.61658 62.687 0.833176 63.0238 1.16596 63.0476L13.9898 63.9636C14.2697 63.9836 14.4783 64.2299 14.452 64.5092L9.85446 113.248C9.79994 113.826 10.6086 114.017 10.8184 113.476L36.4638 47.326C36.5851 47.0133 36.3701 46.6722 36.0356 46.6467L21.6898 45.5539C21.4145 45.533 21.2083 45.2928 21.2292 45.0174L24.5681 1.18613Z"
            // fill="#33F498"
            fill={boltConfig.color}
            // fill="#262626"
          />
        </svg>

        {/* Cover for bottom pin */}
        {(!selectedTokenFrom || !selectedTokenTo) && (
          <div
            className="absolute bg-[#020407] w-8 md:w-4 h-4 z-[51]"
            style={{
              left: '49.5%',
              transform: 'translateX(-50%)',
              bottom: '0',
            }}
          />
        )}
        {selectedTokenFrom && selectedTokenTo && (
          <div
            className="absolute bg-[#020407] w-4 h-4 z-[51]"
            style={{
              left: '49.5%',
              transform: 'translateX(-50%)',
              bottom: '0',
            }}
          />
        )}

        <div
          className={cn(
            'w-full min-h-[53px] md:min-h-[51px] rounded-r-[15px] p-[2px] relative -left-[2px]',
            selectedTokenFrom && selectedTokenTo
              ? 'bg-primary'
              : 'bg-neutral-800'
          )}
        >
          <div
            className={cn(
              'flex justify-center items-center w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-6 rounded-r-[13px]',
              selectedTokenFrom && selectedTokenTo
                ? 'bg-gradient-to-r from-[#071310] to-[#062118] dotsbg'
                : 'bg-[#0D0D0D]'
            )}
          >
            {selectedTokenTo ? (
              <div
                className={cn(
                  'min-w-[120px] sm:min-w-[165px] group w-fit h-12 rounded-[25px] p-[2px] relative max-sm:left-[10px]',
                  selectedTokenTo ? 'bg-borderGradient' : 'bg-[#373D3F]'
                )}
              >
                <div
                  className="min-w-[120px] sm:min-w-[165px] overflow-hidden w-fit h-full bg-[#0D0D0D] group-hover:bg-tabsGradient transition-colors duration-300 p-2 gap-[14px] flex rounded-[25px] items-center justify-between cursor-pointer uppercase font-bold"
                  onClick={() => showSelectTokenModal(true, 'from')}
                >
                  <div className="flex items-center w-fit h-fit">
                    <div className="mr-2.5 relative">
                      <Image
                        src={selectedTokenTo.icon || '/icons/token.svg'}
                        alt={selectedTokenTo.name || ''}
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
                    <p>{selectedTokenTo.symbol || ''}</p>
                  </div>
                  <Image
                    src="/icons/arrow-down-white.svg"
                    alt="close"
                    className="w-fit h-fit mr-4"
                    width={20}
                    height={20}
                  />
                </div>
              </div>
            ) : (
              <div
                className="min-w-[120px] sm:min-w-[165px] relative max-sm:left-[10px] w-fit h-12 bg-primaryGradient hover:opacity-85 py-[13px] px-[20px] gap-[14px] flex rounded-[25px] items-center justify-between text-black cursor-pointer uppercase font-bold"
                onClick={() => showSelectTokenModal(true, 'to')}
              >
                <p>{isMobile ? 'Token' : 'Select Token'}</p>
                <Image
                  src="/icons/arrow-down-black.svg"
                  alt="arrow-down"
                  className="w-fit h-fit"
                  width={20}
                  height={20}
                />
              </div>
            )}
          </div>
        </div>
        {selectedTokenFrom && selectedTokenTo && (
          <Image
            src="/assets/right-strokes.svg"
            alt="valid"
            className={`h-full md:block hidden right-[6.5rem] absolute top-0 blink-animation`}
            width={100}
            height={100}
          />
        )}
      </div>
    </div>
  )
}
