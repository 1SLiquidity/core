import Image from 'next/image'
import { useRef, useState } from 'react'
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside'
import { useModal } from '@/app/lib/context/modalContext'
import SelectTokenWithAmountSection from '../home/SELSection/SelectTokenWithAmountSection'
import InputFieldWithIcon from './InputFieldWithIcon'

interface Props {
  amount: number
  setAmount: (amount: number) => void
  inValidAmount?: boolean
  disabled?: boolean
  isInsufficientBalance?: boolean
  setIsInsufficientBalance?: (isInsufficientBalance: boolean) => void
}

const VolumeSection: React.FC<Props> = ({
  amount,
  setAmount,
  inValidAmount,
  disabled,
  isInsufficientBalance,
  setIsInsufficientBalance,
}) => {
  const [active, setActive] = useState(true)
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
              setAmount(0)
            }}
          >
            Clear
          </div>
        </div>
      )}

      <div
        className={`w-full h-[150px] md:h-[171px] rounded-[15px] p-[2px] relative
          ${
            amount > 0 && !inValidAmount && active
              ? 'bg-primary'
              : inValidAmount
              ? 'bg-primaryRed'
              : 'bg-neutral-800'
          }`}
      >
        <div
          className={`w-full h-full z-20 sticky left-0 top-0 px-5 sm:px-7 py-5 rounded-[13px] ${
            amount > 0 && !inValidAmount && active
              ? 'bg-gradient-to-r from-[#071310] to-[#062118]'
              : 'bg-[#0D0D0D]'
          } ${amount > 0 && !inValidAmount && active && 'dotsbg'}`}
        >
          {/* title */}
          <p className="uppercase text-white text-[18px]">$ Savings</p>

          <div className="w-full h-full">
            <InputFieldWithIcon
              inputField="savings"
              amount={amount}
              setAmount={setAmount}
              inValidAmount={inValidAmount}
              inputRef={sectionRef}
              onInputFocus={() => {
                if (!active) setActive(true)
              }}
              disabled={disabled}
              isInsufficientBalance={isInsufficientBalance}
              setIsInsufficientBalance={setIsInsufficientBalance}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default VolumeSection
