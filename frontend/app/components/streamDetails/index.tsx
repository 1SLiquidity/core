import Image from 'next/image'
import { formatWalletAddress } from '@/app/lib/helper'
import AmountTag from '../amountTag'
import StreamCard from './StreamCard'
import TokenBar from '../tokenBar'
import Button from '../button'
import { Stream } from '../../lib/types/stream'
import ConfigTrade from './ConfigTrade'

type StreamDetailsProps = {
  onBack: () => void
  selectedStream: Stream | null
  walletAddress?: string
  isUser?: boolean
}

const TIMER_DURATION = 10 // 10 seconds

const StreamDetails: React.FC<StreamDetailsProps> = ({
  onBack,
  selectedStream,
  walletAddress = 'GY68234nasmd234asfKT21',
  isUser = false,
}) => {
  if (!selectedStream) {
    return null
  }

  return (
    <>
      <div className="flex justify-between items-end gap-2 h-full sticky bg-black top-0 p-6 px-2 z-40">
        {/* <div className="flex gap-1 text-white cursor-pointer" onClick={onBack}>
          <Image
            src={'/icons/right-arrow.svg'}
            alt="back"
            className="w-2.5 rotate-180"
            width={1000}
            height={1000}
          />
          <p>Back</p>
        </div> */}
        <div className="text-white52 leading-none">Stream ID</div>

        <div className="flex items-center gap-2">
          {/* <p className="text-white52">Stream ID:</p> */}
          <p className="underline text-primary">
            {formatWalletAddress(walletAddress)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end pb-2">
        {selectedStream.isInstasettle && (
          <div className="flex items-center py-1 text-sm gap-1 bg-zinc-900 pl-1 pr-1.5 text-primary rounded-full leading-none">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
            >
              <path
                d="M13 2L6 14H11V22L18 10H13V2Z"
                fill="#40f798"
                fillOpacity="0.72"
              />
            </svg>
            <span className="text-xs sm:inline-block hidden">Instasettle</span>
          </div>
        )}
        <div className="flex bg-white005 items-center gap-2 px-2 py-1 rounded-full">
          <div className="text-xs text-white/70">Auto refresh in</div>
          <div className="relative">
            <svg className="w-4 h-4 transform -rotate-90">
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                className="text-white/10"
              />
              <circle
                cx="8"
                cy="8"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                fill="transparent"
                strokeDasharray="44"
                strokeDashoffset={44 * (1 - 8 / TIMER_DURATION)}
                className="text-primary transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center leading-none text-[0.65rem] font-medium">
              {4}
            </div>
          </div>
        </div>
      </div>
      <div className="pb-6">
        <div className="p-4 rounded-[15px] bg-white005">
          {/* <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Image
                src={selectedStream.fromToken.icon}
                width={32}
                height={32}
                alt={selectedStream.fromToken.symbol}
              />
              <div>
                <p className="text-white">
                  {selectedStream.fromToken.amount}{' '}
                  {selectedStream.fromToken.symbol}
                </p>
                <p className="text-white52">From</p>
              </div>
            </div>
            <Image
              src="/icons/right-arrow.svg"
              width={24}
              height={24}
              alt="to"
            />
            <div className="flex items-center gap-2">
              <Image
                src={selectedStream.toToken.icon}
                width={32}
                height={32}
                alt={selectedStream.toToken.symbol}
              />
              <div>
                <p className="text-white">
                  {selectedStream.toToken.estimatedAmount}{' '}
                  {selectedStream.toToken.symbol}
                </p>
                <p className="text-white52">To (Estimated)</p>
              </div>
            </div>
          </div>

          <div className="w-full h-[3px] bg-white005 relative mb-4">
            <div
              className="h-[3px] bg-primary absolute top-0 left-0"
              style={{
                width: `${
                  (selectedStream.progress.completed /
                    selectedStream.progress.total) *
                  100
                }%`,
              }}
            />
          </div> */}

          <TokenBar
            sellToken={selectedStream.fromToken.symbol}
            buyToken={selectedStream.toToken.symbol}
          />

          <div className="flex gap-2 justify-between py-4 border-b border-borderBottom">
            <div className="flex flex-col leading-tight gap-0.5 items-start">
              <p className="text-white">
                {selectedStream.fromToken.amount}{' '}
                {selectedStream.fromToken.symbol}
              </p>
              <p className="text-white52 text-[14px]">$3,395</p>
            </div>
            <div className="flex flex-col leading-tight gap-0.5 items-end">
              <p className="text-white">
                ~ {selectedStream.toToken.estimatedAmount}{' '}
                {selectedStream.toToken.symbol}
              </p>
              <p className="text-white52 text-[14px]">$3,301</p>
            </div>
          </div>

          <div className="flex gap-2 justify-between py-4 border-b border-borderBottom">
            <div className="flex flex-col leading-tight gap-2 items-start">
              <p className="text-[14px] text-white52">Swapped Input</p>
              <p className="">
                {selectedStream.fromToken.amount}{' '}
                {selectedStream.fromToken.symbol}
              </p>
              <p className="text-white52 text-[14px]">$3,395</p>
            </div>
            <Image
              src={'/icons/long-right-arrow.svg'}
              alt="arrow"
              className="w-6"
              width={1000}
              height={1000}
            />
            <div className="flex flex-col leading-tight gap-2 items-end">
              <p className="text-[14px] text-white52">Output</p>
              <p className="">
                ${selectedStream.toToken.estimatedAmount}{' '}
                {selectedStream.toToken.symbol}
              </p>
              <p className="text-white52 text-[14px]">$1,551</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 py-4 border-b border-borderBottom">
            <AmountTag
              title="BPS Savings"
              amount={selectedStream.isInstasettle ? '20 BPS ($190.54)' : 'N/A'}
              infoDetail="Estimated"
              titleClassName="text-white52"
              amountClassName="text-white52"
              showInstaIcon={selectedStream.isInstasettle}
            />
            {selectedStream.limit && (
              <AmountTag
                title="Limit"
                amount={`1 ${selectedStream.fromToken.symbol} = ${selectedStream.limit.price} ${selectedStream.limit.token}`}
                infoDetail="Estimated"
                titleClassName="text-white52"
              />
            )}
            <AmountTag
              title="Streams Completed"
              // amount={`${selectedStream.progress.completed}/${selectedStream.progress.total}`}
              amount="4"
              infoDetail="Estimated"
              titleClassName="text-white52"
            />
            <AmountTag
              title="Trade Volume Executed"
              // amount={`${selectedStream.progress.completed}/${selectedStream.progress.total}`}
              amount="50%"
              infoDetail="Estimated"
              titleClassName="text-white52"
            />
            <AmountTag
              title="Est time"
              amount={`${selectedStream.timeRemaining} min`}
              infoDetail="Estimated"
              titleClassName="text-white52"
            />
            <AmountTag
              title="Output Fee"
              amount={'$190.54'}
              infoDetail="Estimated"
              titleClassName="text-white52"
            />
            <AmountTag
              title="Network Fee"
              amount={'20 BPS ($190.54)'}
              infoDetail="Estimated"
              titleClassName="text-white52"
            />
            <AmountTag
              title="Wallet Address"
              amount={formatWalletAddress(walletAddress)}
              infoDetail="Estimated"
              titleClassName="text-white52"
            />
          </div>
          {/* {selectedStream.isInstasettle && (
            <div className="mt-4">
              <Button text="Execute Instasettle" />
            </div>
          )} */}
          <ConfigTrade
            amountReceived={'$1,551'}
            fee={'$190.54'}
            isEnabled={selectedStream.isInstasettle}
            isUser={isUser}
          />
        </div>

        <div className="mt-7">
          <p className="text-[20px] pb-1.5">Streams</p>

          <StreamCard
            status="ongoing"
            stream={[
              {
                sell: {
                  amount: selectedStream.fromToken.amount,
                  token: selectedStream.fromToken.symbol,
                },
                buy: {
                  amount: selectedStream.toToken.estimatedAmount,
                  token: selectedStream.toToken.symbol,
                },
              },
            ]}
            isInstasettle={true}
            date={new Date()}
            timeRemaining={10}
            walletAddress={walletAddress}
          />
          {/* <StreamCard
            status="scheduled"
            stream={[
              {
                sell: {
                  amount: 1,
                  token: 'ETH',
                },
                buy: {
                  amount: 3300,
                  token: 'USDC',
                },
              },
              {
                sell: {
                  amount: 1,
                  token: 'ETH',
                },
                buy: {
                  amount: 3300,
                  token: 'USDC',
                },
              },
              {
                sell: {
                  amount: 1,
                  token: 'ETH',
                },
                buy: {
                  amount: 3300,
                  token: 'USDC',
                },
              },
              {
                sell: {
                  amount: 1,
                  token: 'ETH',
                },
                buy: {
                  amount: 3300,
                  token: 'USDC',
                },
              },
              {
                sell: {
                  amount: 1,
                  token: 'ETH',
                },
                buy: {
                  amount: 3300,
                  token: 'USDC',
                },
              },
            ]}
            date={new Date()}
          /> */}
          <StreamCard
            status="completed"
            stream={[
              {
                sell: {
                  amount: 1,
                  token: 'ETH',
                },
                buy: {
                  amount: 3300,
                  token: 'USDC',
                },
              },
            ]}
            date={new Date()}
            timeRemaining={5}
            walletAddress={walletAddress}
          />
          <StreamCard
            status="completed"
            stream={[
              {
                sell: {
                  amount: 2,
                  token: 'ETH',
                },
                buy: {
                  amount: 3000,
                  token: 'USDC',
                },
              },
            ]}
            date={new Date()}
            timeRemaining={2}
            walletAddress={walletAddress}
          />
        </div>
      </div>
    </>
  )
}

export default StreamDetails
