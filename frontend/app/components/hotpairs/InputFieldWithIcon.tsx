import InputAmount from '@/app/components/inputAmount'
import { cn } from '@/lib/utils'

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
            autoFocus={false}
            onInputFocus={onInputFocus}
            disable={disabled}
            isLoading={isLoading}
            skeletonClassName="h-[2.75rem] mt-2"
          />
        </div>
      </div>
      {amount > 0 && (
        <div
          className={cn(
            'mt-2 w-full text-left text-primary',
            isLoading && 'mt-[0.85rem]'
          )}
        >
          Dummy text of the win
        </div>
      )}
    </div>
  )
}

export default InputFieldWithIcon
