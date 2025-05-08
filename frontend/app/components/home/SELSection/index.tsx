'use client'

import { SEL_SECTION_TABS } from '@/app/lib/constants'
import { useToast } from '@/app/lib/context/toastProvider'
import { isNumberValid } from '@/app/lib/helper'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import Button from '../../button'
import Tabs from '../../tabs'
import NotifiSwapStream from '../../toasts/notifiSwapStream'
import DetailSection from '../detailSection'
import CoinBuySection from './coinBuySection'
import CoinSellSection from './coinSellSection'
import LimitSection from './limitSection'
import SwapBox from './swapBox'
import { useModal } from '@/app/lib/context/modalContext'
import { useAppKitAccount } from '@reown/appkit/react'
import { useTokenList } from '@/app/lib/hooks/useTokenList'

const SELSection = () => {
  const [activeTab, setActiveTab] = useState(SEL_SECTION_TABS[0])
  const [sellAmount, setSellAmount] = useState(0)
  const [buyAmount, setBuyAmount] = useState(0)
  const [isSellAmountActive, setIsSellAmountActive] = useState(false)
  const [invaliSelldAmount, setInvalidSellAmount] = useState(false)
  const [invalidBuyAmount, setInvalidBuyAmount] = useState(false)
  const [swap, setSwap] = useState(false)

  const { addToast } = useToast()
  const { selectedTokenFrom, selectedTokenTo } = useModal()
  const [reserves, setReserves] = useState(null)
  const { address, isConnected } = useAppKitAccount()

  // Preload the token list when the component mounts
  const { tokens, isLoading } = useTokenList()

  // Add new useEffect to fetch reserves when both tokens are selected
  useEffect(() => {
    const fetchReserves = async () => {
      console.log('fetching reserves')
      if (selectedTokenFrom && selectedTokenTo) {
        try {
          // Check if tokens have addresses
          const fromAddress =
            selectedTokenFrom.token_address ||
            '0xdAC17F958D2ee523a2206206994597C13D831ec7' // Default to USDT if no address
          const toAddress =
            selectedTokenTo.token_address ||
            '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' // Default to UNI if no address

          const response = await fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/reserves?tokenA=${fromAddress}&tokenB=${toAddress}`
          )

          console.log('Reserver API response ===>', response)

          if (!response.ok) {
            throw new Error('Failed to fetch reserves')
          }

          const data = await response.json()
          setReserves(data)
          console.log('Reserves data:', data)
        } catch (error) {
          console.error('Error fetching reserves:', error)
        }
      }
    }

    fetchReserves()
  }, [selectedTokenFrom, selectedTokenTo])

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
      setSellAmount(buyAmount)
      setBuyAmount(sellAmount)
      setSwap(!swap)
    }
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
            setAmount={(val: any) => setBuyAmount(val)}
            inValidAmount={invalidBuyAmount}
            swap={swap}
          />
        ) : (
          <CoinSellSection
            amount={sellAmount}
            setAmount={(val: any) => {
              setSellAmount(val)
            }}
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
            setAmount={(val: any) => {
              setSellAmount(val)
            }}
            inValidAmount={invaliSelldAmount}
            swap={swap}
          />
        ) : (
          <CoinBuySection
            amount={buyAmount}
            setAmount={(val: any) => setBuyAmount(val)}
            inValidAmount={invalidBuyAmount}
            swap={swap}
          />
        )}
      </div>

      {/* Detail Section */}
      {buyAmount > 0 &&
        sellAmount > 0 &&
        selectedTokenFrom &&
        selectedTokenTo && (
          <DetailSection
            sellAmount={`${swap ? buyAmount : sellAmount}`}
            buyAmount={`${swap ? sellAmount : buyAmount}`}
            inValidAmount={invaliSelldAmount || invalidBuyAmount}
            reserves={reserves}
          />
        )}

      <div className="w-full my-[30px]">
        {isConnected ? (
          <Button
            text="Swap"
            theme="gradient"
            onClick={() => addToast(<NotifiSwapStream />)}
            error={
              invaliSelldAmount || invalidBuyAmount
              // !selectedTokenFrom ||
              // !selectedTokenTo
            }
            disabled={!selectedTokenFrom || !selectedTokenTo}
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
