'use client'

import Image from 'next/image'

export default function CryptoCard() {
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
        <div className="flex flex-col gap-2 justify-between">
          <div className="flex items-center justify-between w-full gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-5">
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
              <h2 className="text-white text-xl font-semibold">USDT / USDC</h2>
            </div>
            <div className="text-2xl font-bold text-[#40FAAC]">$1,563</div>
          </div>
          <div className="flex items-center justify-between w-full">
            <p className="text-zinc-400 text-lg">1,000 USDT - 5.2%</p>
            <p className="text-zinc-400 text-lg">in est. savings</p>
          </div>
        </div>
      </div>
    </div>
  )
}
