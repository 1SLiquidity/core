import Image from 'next/image';
import React from 'react';

type Props = {
  limit?: boolean;
  limitContent?: React.ReactNode;
  onClick?: () => void;
};

const SwapStream: React.FC<Props> = ({
  limit,
  limitContent,
  onClick,
}) => {
  return (
    <div
      className="w-full border border-white14 relative bg-white005 p-4 rounded-[15px] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex mr-8 items-center gap-1.5 absolute top-4 left-2">
        <Image
          src="/icons/swap-stream.svg"
          width={24}
          height={24}
          alt="swapStream"
        />
      </div>

      {/* main content */}
      <div className="ml-[27px] flex flex-col">
        <div className="flex gap-[6px] items-center">
          <div className="flex items-center gap-1">
            <Image
              src="/tokens/eth.svg"
              width={2400}
              height={2400}
              alt="swapStream"
              className="w-[18px] h-[18px]"
            />
            <p className="text-white72 uppercase">1 ETH</p>
          </div>
          <Image
            src="/icons/right-arrow.svg"
            width={2400}
            height={2400}
            alt="swapStream"
            className="w-[10px]"
          />
          <div className="flex items-center gap-1">
            <Image
              src="/tokens/usdc.svg"
              width={2400}
              height={2400}
              alt="swapStream"
              className="w-[18px] h-[18px]"
            />
            <p className="text-white72 uppercase">3,300 USDC (Est)</p>
          </div>
        </div>

        <div className="w-full h-[3px] bg-white005 mt-[12px] relative">
          <div
            className="w-[80%] h-[3px] bg-primary absolute top-0 left-0"
            // style={{ animation: 'fillup 2s linear forwards' }}
          />
        </div>

        <div className="mt-[3px] flex justify-between items-center gap-2 text-white52">
          <p className="">1/2 completed</p>
          <div className="flex gap-1">
            {' '}
            <Image
              src="/icons/time.svg"
              alt="clock"
              className="w-5"
              width={20}
              height={20}
            />
            <p>9 min</p>
          </div>
        </div>

        {limit && (
          <div className="flex gap-1.5 mt-1 items-center">
            <div className="p-[3px] rounded-[4px] !text-[12px] flex items-center justify-center bg-primary uppercase text-black">
              Limit
            </div>
            <div className="text-white52 text-[14px]">
              {limitContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapStream;
