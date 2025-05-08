'use client';

import useOnClickInside from '@/app/lib/hooks/useOnClickInside';
import useOnClickOutside from '@/app/lib/hooks/useOnClickOutside';
import React, { useRef, useState } from 'react';
import { NumericFormat } from 'react-number-format';

interface InputAmountProps {
  amount: number;
  setAmount?: (value: number) => void;
  disable?: boolean;
  textAlignRight?: boolean;
  inValidAmount?: boolean;
  inputRef?: any;
  onInputFocus?: () => void;
}

const InputAmount: React.FC<InputAmountProps> = ({
  amount,
  setAmount,
  disable = false,
  textAlignRight = false,
  inValidAmount,
  inputRef,
  onInputFocus,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(false);

  // Handler to update the amount
  const handleValueChange = (values: any) => {
    const { floatValue } = values;
    if (setAmount) setAmount(floatValue || 0);
  };

  // useOnClickOutside(inputRef, () => {
  //   // const inputElement = wrapperRef.current?.querySelector('input');
  //   // if (inputElement) {
  //   //   inputElement.focus();
  //   // }
  //   setFocus(true);
  // });

  return (
    <NumericFormat
      value={amount == 0 ? '' : amount}
      displayType={'input'}
      thousandSeparator={true}
      // decimalScale={2}
      fixedDecimalScale={true}
      onFocus={onInputFocus}
      onValueChange={handleValueChange}
      placeholder="0"
      autoFocus={true}
      disabled={disable}
      className={`w-full placeholder:text-white disabled:opacity-55 h-full bg-transparent border-none outline-none placeholder:text-gray text-[30px] md:text-[42px] ${
        textAlignRight ? 'text-right' : ''
      } ${inValidAmount ? 'text-primaryRed' : ''}`}
    />
  );
};

export default InputAmount;
