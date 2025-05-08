import Image from 'next/image'
import React, { useState } from 'react'
import AmountTag from '../../amountTag'

type Props = {
  sellAmount: string
  buyAmount: string
  inValidAmount?: boolean
  reserves?: any
}

const DetailSection: React.FC<Props> = ({
  sellAmount,
  buyAmount,
  inValidAmount,
  reserves,
}) => {
  const [showDetails, setShowDetails] = useState(true)

  const toggleDetails = () => setShowDetails(!showDetails)

  return (
    <div className="w-full p-5 border-[2px] border-white12 bg-[#0D0D0D] mt-[26px] rounded-[15px]">
      <div
        className={`w-full flex justify-between gap-1 duration-300 ease-in-out cursor-pointer`}
        onClick={toggleDetails}
      >
        <div
          className={`flex gap-1.5 ${inValidAmount ? 'text-primaryRed' : ''}`}
        >
          {inValidAmount && (
            <Image
              src="/icons/warning.svg"
              alt="error"
              className="w-5"
              width={20}
              height={20}
            />
          )}
          <p>{sellAmount} ETH</p>
          {inValidAmount ? (
            <Image
              src="/icons/red-right-arrow.svg"
              alt="swap"
              className="w-2.5"
              width={20}
              height={20}
            />
          ) : (
            <Image
              src="/icons/right-arrow.svg"
              alt="swap"
              className="w-2.5"
              width={20}
              height={20}
            />
          )}
          <p>{buyAmount} USDC (Est)</p>
        </div>
        <div className="flex gap-2.5 items-center">
          <div className="flex gap-1.5">
            <Image
              src="/icons/time.svg"
              alt="clock"
              className="w-5"
              width={20}
              height={20}
            />
            <p>9 min</p>
          </div>
          <Image
            src="/icons/up-arrow.svg"
            alt="up-arrow"
            className={`w-2.5 ${showDetails ? 'rotate-0' : 'rotate-180'}`}
            width={20}
            height={20}
          />
        </div>
      </div>

      {/* Animate visibility of amount details */}
      <div
        className={`transition-height duration-300 ease-in-out overflow-hidden ${
          showDetails
            ? 'max-h-[1000px] border-t mt-4 border-borderBottom'
            : 'max-h-0'
        }`}
      >
        <div className="w-full flex flex-col gap-2 py-4 border-b border-borderBottom">
          <AmountTag
            title="Protocol Fee (20 BPS)"
            amount={'$42.16'}
            infoDetail="Estimated"
          />
          <AmountTag
            title="Network Fee (0.25%)"
            amount={'$19.41'}
            infoDetail="Estimated"
          />
          <AmountTag
            error={inValidAmount}
            title="Estimated Output"
            amount={'3,300 USDC  ($3,096.69)'}
            infoDetail="Estimated"
          />
          <AmountTag
            title="Min. Estimated Output"
            amount={'3,240 USDC ($3,000.69)'}
            infoDetail="Estimated"
          />
          <AmountTag title="Slippage" amount={'5%'} infoDetail="Estimated" />
          <AmountTag
            title="Price Impact"
            amount={'0.25%'}
            infoDetail="Estimated"
          />
        </div>
        <div className="w-full flex flex-col gap-2 py-4">
          <AmountTag
            title="Stream Volume ($)"
            amount={'$3,096.69'}
            infoDetail="Estimated"
          />
          <AmountTag
            title="Est. Stream Count"
            amount={'5'}
            infoDetail="Estimated"
          />
          <AmountTag
            title="Est. Time"
            amount={'12 mins'}
            infoDetail="Estimated"
          />
        </div>
      </div>

      {reserves && (
        <div
          className={`transition-height duration-300 ease-in-out overflow-hidden ${
            showDetails
              ? 'max-h-[1000px] border-t mt-4 border-borderBottom'
              : 'max-h-0'
          }`}
        >
          <div className="w-full flex flex-col gap-2 py-4 border-b border-borderBottom">
            <h3 className="text-white font-medium mb-2">Liquidity Reserves</h3>
            {reserves &&
              reserves.map((reserve: any, index: any) => (
                <div key={index} className="mb-2">
                  <p className="text-white70 text-sm">Reserve {index + 1}</p>
                  <div className="flex justify-between mt-1">
                    <p className="text-white text-sm">Token 0:</p>
                    <p className="text-white text-sm">
                      {reserve.reserves.token0
                        ? parseFloat(reserve.reserves.token0).toFixed(5)
                        : '0'}
                    </p>
                  </div>
                  <div className="flex justify-between mt-1">
                    <p className="text-white text-sm">Token 1:</p>
                    <p className="text-white text-sm">
                      {reserve.reserves.token1
                        ? parseFloat(reserve.reserves.token1).toFixed(5)
                        : '0'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DetailSection
