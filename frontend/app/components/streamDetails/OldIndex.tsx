import Image from 'next/image'
import { formatWalletAddress } from '@/app/lib/helper'
import AmountTag from '../amountTag'
import StreamCard from '../streamCard'
import TokenBar from '../tokenBar'
import Button from '../button'

const StreamDetails = ({
  onBack,
  walletAddress,
}: {
  onBack: () => void
  walletAddress: string
}) => {
  return (
    <>
      <div className="flex justify-between gap-2 h-full sticky bg-black top-0 p-6 z-40">
        <div className="flex gap-1 text-white cursor-pointer" onClick={onBack}>
          <Image
            src={'/icons/right-arrow.svg'}
            alt="back"
            className="w-2.5 rotate-180"
            width={1000}
            height={1000}
          />
          <p>Back</p>
        </div>
        <p className="underline text-primary">
          {formatWalletAddress(walletAddress)}
        </p>
      </div>

      <div className="pb-6">
        <div className="p-4 rounded-[15px] bg-white005">
          {/* @ts-expect-error TODO: fix this */}
          <TokenBar sellToken="ETH" buyToken="USDC" />
          <div className="flex gap-2 justify-between py-4 border-b border-borderBottom">
            <div className="flex flex-col leading-tight gap-0.5 items-start">
              <p className="text-white">1 ETH</p>
              <p className="text-white52 text-[14px]">$3,395</p>
            </div>
            <div className="flex flex-col leading-tight gap-0.5 items-end">
              <p className="text-white">~ 3,300 USDC</p>
              <p className="text-white52 text-[14px]">$3,301</p>
            </div>
          </div>

          <div className="flex gap-2 justify-between py-4 border-b border-borderBottom">
            <div className="flex flex-col leading-tight gap-0.5 items-start">
              <p className="text-[14px] text-white">Swapped Input</p>
              <p className="">1 ETH</p>
              <p className="text-white52 text-[14px]">$3,395</p>
            </div>
            <Image
              src={'/icons/long-right-arrow.svg'}
              alt="arrow"
              className="w-6"
              width={1000}
              height={1000}
            />
            <div className="flex flex-col leading-tight gap-0.5 items-end">
              <p className="text-[14px] text-white">Output</p>
              <p className="">$1,550 USDC</p>
              <p className="text-white52 text-[14px]">$1,551</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 py-4 border-b border-borderBottom">
            <AmountTag
              title="Limit"
              amount={'1 ETH = 0.0000 USDC'}
              infoDetail="Estimated"
            />
            <AmountTag
              title="Streams Completed"
              amount={'4/6'}
              infoDetail="Estimated"
            />
            <AmountTag
              title="Est time"
              amount={'19min 2 sec'}
              infoDetail="Estimated"
            />
            {/* <AmountTag
              title="Output Fee"
              amount={'$190.54'}
              infoDetail="Estimated"
            /> */}
            <AmountTag
              title="Wallet Address"
              amount={formatWalletAddress('0X2A324324324642F')}
              infoDetail="Estimated"
            />
          </div>
          <div className="mt-4">
            <Button text="Execute Instasettle" />
          </div>
        </div>
        <div className="mt-7">
          <p className="text-[20px] pb-1.5">Streams</p>

          <StreamCard
            status="ongoing"
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
            walletAddress="0X2A324324324642F"
          />
          <StreamCard
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
          />
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
            walletAddress="0X2A324324324642F"
          />
        </div>
      </div>
    </>
  )
}

export default StreamDetails
