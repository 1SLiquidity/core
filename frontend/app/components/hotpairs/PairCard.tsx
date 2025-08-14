'use client'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Button from '../button'
import { useRouter } from 'next/navigation'

export default function PairCard({
  pair,
  isActive,
  onClick,
}: {
  pair: any
  isActive: boolean
  onClick: (pair: any) => void
}) {
  const router = useRouter()

  const handleStreamClick = () => {
    // Navigate to swaps page with token symbols as query parameters
    const searchParams = new URLSearchParams({
      from: pair.token1Symbol,
      to: pair.token2Symbol,
    })

    router.push(`/swaps?${searchParams.toString()}`)
  }

  return (
    <div
      className="group relative rounded-md p-[2px] transition-all duration-300 cursor-pointer max-w-[18rem]"
      onClick={() => onClick(pair)}
    >
      <div
        className={cn(
          'relative z-10 p-3 rounded-md border border-[#012B32] transition-colors duration-300',
          isActive && 'border-[#40f798]'
        )}
        style={{
          background:
            'linear-gradient(96.29deg, rgba(2, 11, 16, 0.18) 4.96%, rgba(0, 94, 78, 0.18) 96.89%)',
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Top section: Icons and Pair Name */}
          <div className="flex items-center gap-3 w-full justify-center">
            <div
              className={cn(
                'flex items-center transition-all duration-300',
                isActive ? 'translate-x-0' : 'group-hover:-translate-x-1'
              )}
            >
              {/* Ethereum icon */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10">
                <Image
                  src={pair.icon1}
                  alt="eth"
                  width={20}
                  height={20}
                  className="w-full h-full"
                />
              </div>

              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 transition-all duration-300',
                  isActive
                    ? 'translate-x-0 ml-0'
                    : 'group-hover:translate-x-0 group-hover:ml-0'
                )}
              >
                <Image
                  src={pair.icon2}
                  alt="dai"
                  width={20}
                  height={20}
                  className="w-full h-full"
                />
              </div>
            </div>
            <h2 className="text-white text-xl font-semibold">{pair.pair}</h2>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-2 w-full text-center items-center">
            {/* Labels */}
            <p className="text-white text-sm uppercase">VOL</p>
            <div className="flex justify-center items-center">
              <div className="w-4 h-[1px] bg-zinc-400" />{' '}
              {/* The longer dashbar */}
            </div>
            <p className="text-white text-sm uppercase">WIN</p>
            <div className="flex justify-center items-center">
              <div className="w-4 h-[1px] bg-zinc-400" />{' '}
              {/* The longer dashbar */}
            </div>
            <p className="text-white text-sm uppercase">SAVE</p>
            {/* Values */}
            <p className="text-zinc-400 text-lg font-bold">{pair.vol}</p>
            <div className="col-span-1"></div>{' '}
            {/* Empty div to align values under labels */}
            <p className="text-zinc-400 text-lg font-bold">{pair.win}%</p>
            <div className="col-span-1"></div>{' '}
            {/* Empty div to align values under labels */}
            <p className="text-[#40FAAC] text-lg font-bold">${pair.price}</p>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            <Button
              text="STREAM NOW"
              className="h-9 w-full text-[#40f798]"
              onClick={handleStreamClick}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
