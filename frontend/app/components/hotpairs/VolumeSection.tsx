import Image from 'next/image'
import { useRef, useState } from 'react'
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside'
import { useModal } from '@/app/lib/context/modalContext'
import SelectTokenWithAmountSection from '../home/SELSection/SelectTokenWithAmountSection'
import InputFieldWithIcon from './InputFieldWithIcon'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InfoIcon } from '@/app/lib/icons'
import InputFieldWithTokenPair from './InputFieldWithTokenPair'

interface Props {
  pair: any
  amount: number
  setAmount: (amount: number) => void
  inValidAmount?: boolean
  disabled?: boolean
  isInsufficientBalance?: boolean
  setIsInsufficientBalance?: (isInsufficientBalance: boolean) => void
  switchTokens: () => void
  clearActiveTokenPair: () => void
  active: boolean
  handleActive: (active: boolean) => void
  isLoading: boolean
}

const VolumeSection: React.FC<Props> = ({
  pair,
  amount,
  setAmount,
  inValidAmount,
  disabled,
  isInsufficientBalance,
  setIsInsufficientBalance,
  switchTokens,
  clearActiveTokenPair,
  active,
  handleActive,
  isLoading,
}) => {
  // const [active, setActive] = useState(true)
  const sectionRef = useRef<HTMLDivElement>(null)

  // useOnClickOutside(sectionRef, () => {
  //   setActive(false)
  // })

  return (
    <div ref={sectionRef} className="md:w-fit w-full h-fit relative">
      {amount > 0 && (
        <div className="absolute -top-9 right-2 z-[100]">
          <div
            className="flex items-center justify-center rounded-md bg-neutral-700 py-[2px] px-2 hover:bg-neutral-800 cursor-pointer"
            onClick={() => {
              clearActiveTokenPair()
            }}
          >
            Clear
          </div>
        </div>
      )}

      <div
        className={`w-full h-[150px] md:h-[171px] md:min-w-[25rem] rounded-[15px] p-[2px] relative
          ${
            amount > 0 && !inValidAmount
              ? 'bg-primary'
              : inValidAmount
              ? 'bg-primaryRed'
              : 'bg-neutral-800'
          }`}
      >
        <div
          className={`w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-5 rounded-[13px] overflow-hidden ${
            amount > 0 && !inValidAmount
              ? active
                ? 'bg-gradient-to-r from-[#071310] to-[#062118]'
                : 'bg-[#0D0D0D]'
              : 'bg-[#0D0D0D]'
          } ${amount > 0 && !inValidAmount && 'dotsbg'}`}
        >
          {/* title */}
          <div className="flex items-center gap-2">
            <p className="uppercase text-white text-[18px]">Volume</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 cursor-help block" />
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-800 text-white border-zinc-700">
                  <p>Volume info</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="w-full h-full">
            <InputFieldWithTokenPair
              inputField="savings"
              amount={amount}
              setAmount={setAmount}
              inValidAmount={inValidAmount}
              inputRef={sectionRef}
              onInputFocus={() => {
                handleActive(true)
              }}
              disabled={disabled}
              isInsufficientBalance={isInsufficientBalance}
              setIsInsufficientBalance={setIsInsufficientBalance}
              icon1={pair?.icon1}
              icon2={pair?.icon2}
              switchTokens={switchTokens}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default VolumeSection
