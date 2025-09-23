'use client'

import { useState, useRef, useEffect } from 'react'
import {
  ChevronRight,
  Info,
  ChevronLeft,
  Zap,
  Check,
  X,
  InfoIcon,
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
import { FireIcon } from './HotPair/fire-icon'

export default function TradingSettings() {
  const [isOpen, setIsOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showTradeOptions, setShowTradeOptions] = useState(false)
  const [defaultSelected, setDefaultSelected] = useState(true)
  const [uniswapXEnabled, setUniswapXEnabled] = useState(true)
  const [v4PoolsEnabled, setV4PoolsEnabled] = useState(true)
  const [v3PoolsEnabled, setV3PoolsEnabled] = useState(true)
  const [v2PoolsEnabled, setV2PoolsEnabled] = useState(true)

  const { isMobile, isXl, isDesktop, isTablet } = useScreenSize()

  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(isXl)
    }, 400)

    return () => clearTimeout(timer)
  }, [isXl])

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
      {/* Settings Button */}
      <div
        ref={buttonRef}
        onClick={toggleDropdown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group cursor-pointer relative"
      >
        {/* Background gradient container */}
        <div
          className={`
        absolute inset-0 rounded-[12px] p-[1px] transition-all duration-300 ease-out
        ${isHovered || isOpen ? 'opacity-100' : 'opacity-0'}
      `}
          style={{
            background:
              isHovered || isOpen
                ? 'linear-gradient(90deg, #33F498 0%, #00CCFF 100%)'
                : 'transparent',
            transitionProperty: 'opacity, background',
          }}
        >
          {/* Inner background with gradient */}
          <div
            className="w-full h-full rounded-[11px] transition-all duration-300 ease-out"
            style={{
              background:
                isHovered || isOpen
                  ? 'linear-gradient(90deg, #071310 0%, #042418 100%)'
                  : 'transparent',
            }}
          />
        </div>

        <div
          className={`relative flex items-center gap-2 w-fit h-8 px-3 rounded-[12px] transition-all duration-300 ease-out ${
            isOpen || isHovered ? 'bg-transparent' : 'bg-white bg-opacity-[12%]'
          }`}
        >
          <span
            className={`text-sm transition-colors duration-300 ${
              isOpen || isHovered ? 'text-white' : 'text-zinc-400'
            }`}
          >
            ADVANCED
          </span>

          <div
            className={`relative transition-all duration-300 ease-in-out transform ${
              isHovered || isOpen ? 'rotate-90' : 'rotate-0'
            }`}
          >
            <SettingsIcon
              className={cn(
                'w-fit h-fit block',
                isOpen || isHovered ? 'text-[#40F798]' : 'text-[#666666]'
              )}
            />
          </div>
        </div>
      </div>

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
                ? 'origin-left left-full top-0 ml-6'
                : 'origin-top right-0 top-full mt-2'
            )}
          >
            <Card className="w-[350px] bg-zinc-900 border-zinc-800 text-white rounded-xl border-2">
              {showTradeOptions ? (
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center">
                    <div
                      className="mr-2 text-zinc-400 hover:bg-zinc-800 hover:text-white rounded-md cursor-pointer"
                      onClick={() => setShowTradeOptions(false)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-medium text-center flex-1">
                      Trade options
                    </h2>
                  </div>

                  <div className="flex items-start justify-between mt-4">
                    <div>
                      <div className="flex !items-start gap-2 mb-[10px]">
                        <span className="text-lg font-medium leading-none">
                          Default
                        </span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-zinc-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                              <p>Default trading options</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-zinc-400 mt-1 text-sm">
                        Selecting this option identifies the most efficient
                        route for your swap.
                      </p>
                    </div>
                    <Switch
                      checked={defaultSelected}
                      onCheckedChange={setDefaultSelected}
                    />
                  </div>

                  {!defaultSelected && (
                    <div className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="text-lg text-primary">UniswapX</span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-zinc-500 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                                <p>Enable UniswapX for better pricing</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Switch
                          checked={uniswapXEnabled}
                          onCheckedChange={setUniswapXEnabled}
                        >
                          <div className="h-4 w-4 bg-white rounded-full flex items-center justify-center">
                            {uniswapXEnabled && <Check className="h-3 w-3" />}
                          </div>
                        </Switch>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg">Enable v4 pools</span>
                        <Switch
                          checked={v4PoolsEnabled}
                          onCheckedChange={setV4PoolsEnabled}
                        >
                          <div className="h-4 w-4 bg-white rounded-full flex items-center justify-center">
                            {v4PoolsEnabled && <Check className="h-3 w-3" />}
                          </div>
                        </Switch>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg">Enable v3 pools</span>
                        <Switch
                          checked={v3PoolsEnabled}
                          onCheckedChange={setV3PoolsEnabled}
                        >
                          <div className="h-4 w-4 bg-white rounded-full flex items-center justify-center">
                            {v3PoolsEnabled && <Check className="h-3 w-3" />}
                          </div>
                        </Switch>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-lg">Enable v2 pools</span>
                        <Switch
                          checked={v2PoolsEnabled}
                          onCheckedChange={setV2PoolsEnabled}
                        >
                          <div className="h-4 w-4 bg-white rounded-full flex items-center justify-center">
                            {v2PoolsEnabled && <Check className="h-3 w-3" />}
                          </div>
                        </Switch>
                      </div>
                    </div>
                  )}
                </CardContent>
              ) : (
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <SettingsIcon className="transition-all duration-300 w-5 h-5 text-[#40F798]" />
                        <h2 className="text-xl font-medium text-center flex-1">
                          ADVANCED
                        </h2>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <InfoIcon className="h-5 w-5 cursor-help block" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                            <p>Advanced Trade Options</p>
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
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium">
                        Instasettlable
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-zinc-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                            <p>
                              Maximum price difference you're willing to accept
                              for this trade
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative w-[120px]">
                      <Input
                        //   type="number"
                        defaultValue="100"
                        step="0.1"
                        min="0.1"
                        className="pr-12 border-zinc-700 text-white rounded-full text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                        BPS
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium">Swap deadline</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-zinc-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                            <p>
                              Your transaction will revert if it is pending for
                              more than this period of time
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="relative w-[120px] flex items-center">
                      <Input
                        //   type="number"
                        defaultValue="4"
                        step="1"
                        min="1"
                        className="pr-[4.2rem] border-zinc-700 text-white rounded-full text-right"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">
                        minutes
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-medium">Trade options</span>
                    </div>
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => setShowTradeOptions(true)}
                    >
                      <span className="text-zinc-400">Default</span>
                      <ChevronRight className="h-5 w-5 text-zinc-400" />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
