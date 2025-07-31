'use client'
import Image from 'next/image'

export default function CryptoCard2() {
  return (
    <div className="group relative rounded-md p-[1px] transition-all duration-300 cursor-pointer">
      <div
        className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(87.35deg, #3F4542 2.21%, #33F498 100%)',
        }}
      ></div>

      <div
        className="relative z-10 p-3 rounded-md bg-gradient-to-b from-[#2C2D2E] to-[#292B2C]
                 border border-[#3F4542] group-hover:border-transparent transition-colors duration-300"
      >
        <div className="flex flex-col gap-2">
          {/* Top section: Icons and Pair Name */}
          <div className="flex items-center gap-3 w-full justify-center">
            <div className="flex items-center -space-x-4">
              {/* Ethereum icon */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10">
                <Image
                  src="/icons/usdc.svg"
                  alt="eth"
                  width={20}
                  height={20}
                  className="w-full h-full"
                />
              </div>

              <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33]">
                <Image
                  src="/icons/bnb.svg"
                  alt="dai"
                  width={20}
                  height={20}
                  className="w-full h-full"
                />
              </div>
            </div>
            <h2 className="text-white text-xl font-semibold">WETH / USDC</h2>
          </div>

          {/* Data Grid */}
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
            <p className="text-zinc-400 text-lg font-bold">1500</p>
            <div className="col-span-1"></div>{' '}
            {/* Empty div to align values under labels */}
            <p className="text-zinc-400 text-lg font-bold">27%</p>
            <div className="col-span-1"></div>{' '}
            {/* Empty div to align values under labels */}
            <p className="text-[#40FAAC] text-lg font-bold">$1,234</p>
          </div>
        </div>
      </div>
    </div>
  )
}
