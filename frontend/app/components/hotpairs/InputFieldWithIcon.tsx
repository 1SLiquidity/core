import InputAmount from '@/app/components/inputAmount'
import Image from 'next/image'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { motion, AnimatePresence } from 'framer-motion'
import { GreaterThanIcon } from './hotpairs-icons'

interface InputAmountProps {
  amount: number
  setAmount: any
  inValidAmount?: boolean
  inputRef?: any
  inputField: 'win' | 'savings'
  onInputFocus?: () => void
  disabled?: boolean
  isLoading?: boolean
  isInsufficientBalance?: boolean
  setIsInsufficientBalance?: (isInsufficientBalance: boolean) => void
}

const InputFieldWithIcon: React.FC<InputAmountProps> = ({
  amount,
  setAmount,
  inValidAmount,
  inputRef,
  inputField,
  onInputFocus,
  disabled,
  isLoading,
  isInsufficientBalance,
  setIsInsufficientBalance,
}) => {
  // Get token list from useTokenList hook
  const { tokens: allTokens, isLoading: isLoadingTokenList } = useTokenList()

  const [showTooltip, setShowTooltip] = useState(false)
  const [tokenBalance, setTokenBalance] = useState('0')
  const [showTopTokens, setShowTopTokens] = useState(false)
  const buttonRef = useRef<HTMLDivElement>(null)

  return (
    <div className="w-full">
      <div className="w-full flex gap-4 items-center justify-between mt-[12px]">
        {/* amount */}
        <div className="flex-1">
          <InputAmount
            inputRef={inputRef}
            amount={amount}
            inValidAmount={inValidAmount}
            setAmount={(val: any) => {
              setAmount(val)
            }}
            onInputFocus={onInputFocus}
            disable={disabled}
            isLoading={isLoading}
          />
        </div>

        <div className="flex items-center justify-center p-2 px-4 rounded-full border-[#D3D3D324] border-[1px] bg-[#FFFFFF1F]">
          <GreaterThanIcon />
        </div>
      </div>
    </div>
  )
}

export default InputFieldWithIcon
