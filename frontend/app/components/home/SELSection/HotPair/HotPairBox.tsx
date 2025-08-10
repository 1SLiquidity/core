'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronRight,
  Info,
  ChevronLeft,
  Zap,
  Check,
  ArrowRight,
  X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import SettingsIcon from '@/app/shared/icons/Settings'
import { useScreenSize } from '@/app/lib/hooks/useScreenSize'
import { cn } from '@/lib/utils'
import HotPairButton from './button'
import { FireIcon } from './fire-icon'
import { InfoIcon } from '@/app/lib/icons'
import CryptoCard from './CryptoCard'
import CryptoCard2 from './CryptoCard2'

const hotPairs = [
  {
    // icon1: '/tokens/leo.png',
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/weth.webp',
    // pair: 'LEO / USDT',
    pair: 'USDT / WETH',
    price: 1000,
    vol: 1000,
    win: 10,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: true,
  },
  {
    // icon1: '/tokens/aave.webp',
    // icon2: '/tokens/eth.svg',
    // pair: 'AAVE / ETH',
    icon1: '/tokens/usdc.svg',
    icon2: '/tokens/weth.webp',
    pair: 'USDC / WETH',
    price: 2000,
    vol: 1000,
    win: 20,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
  {
    // icon1: '/tokens/etc.png',
    // icon2: '/tokens/usdt.webp',
    // pair: 'ETC / USDT',
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/usdc.svg',
    pair: 'USDT / USDC',
    price: 3000,
    vol: 1000,
    win: 15,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
]
export default function HotPairBox() {
  const [isOpen, setIsOpen] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [showTradeOptions, setShowTradeOptions] = useState(false)
  const [defaultSelected, setDefaultSelected] = useState(true)
  const [uniswapXEnabled, setUniswapXEnabled] = useState(true)
  const [v4PoolsEnabled, setV4PoolsEnabled] = useState(true)
  const [v3PoolsEnabled, setV3PoolsEnabled] = useState(true)
  const [v2PoolsEnabled, setV2PoolsEnabled] = useState(true)

  const { isMobile, isXl, isDesktop } = useScreenSize()

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  // useEffect(() => {
  //   const handleClickOutside = (event: MouseEvent) => {
  //     if (
  //       dropdownRef.current &&
  //       buttonRef.current &&
  //       !dropdownRef.current.contains(event.target as Node) &&
  //       !buttonRef.current.contains(event.target as Node)
  //     ) {
  //       setIsOpen(false)
  //     }
  //   }

  //   document.addEventListener('mousedown', handleClickOutside)
  //   return () => {
  //     document.removeEventListener('mousedown', handleClickOutside)
  //   }
  // }, [])

  const toggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative inline-block z-[5555555]">
      <HotPairButton
        ref={buttonRef}
        onClick={toggleDropdown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        isOpen={isOpen}
        isHovered={isHovered}
        className="group cursor-pointer"
      />

      {/* Dropdown Menu - Absolutely Positioned */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className={cn(
              'absolute z-50 overflow-hidden',
              isXl
                ? 'origin-right right-full top-0 mr-2'
                : 'origin-top left-0 top-full mt-2'
            )}
          >
            <Card className="w-[350px] bg-zinc-900 border-zinc-800 text-white rounded-xl border-2">
              <CardContent className="p-4 space-y-5">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <FireIcon
                        className="transition-all duration-300 w-5 h-5"
                        isActive={isHovered || isOpen}
                      />
                      <h2 className="text-xl font-medium text-center flex-1">
                        HOT PAIRS
                      </h2>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-5 w-5 cursor-help block" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                          <p>Hot pair info</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center text-gray-400 group-hover:text-white hover:bg-[#827a7a33] group cursor-pointer group p-[0.15rem] rounded-md transition-all duration-300"
                  >
                    <X className="h-4 w-4 text-[#3F4542] group-hover:text-white transition-all duration-300" />
                  </div>
                  {/*  */}
                </div>

                <div className="flex flex-col gap-4">
                  {hotPairs.map((pair, index) => (
                    <CryptoCard2
                      key={index}
                      icon1={pair.icon1}
                      icon2={pair.icon2}
                      pair={pair.pair}
                      price={pair.price}
                      vol={pair.vol}
                      win={pair.win}
                      isActive={pair.isActive}
                    />
                  ))}
                  {/* <CryptoCard />
                  <CryptoCard2 /> */}
                </div>
                <div className="flex w-full justify-center items-center group">
                  <div className="flex items-center justify-center gap-2 cursor-pointer text-zinc-400 group-hover:text-white hover:text-white">
                    <span>View all pairs</span>
                    <ArrowRight className="h-4 w-4 " />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
