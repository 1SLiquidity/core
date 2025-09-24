import Image from 'next/image'
import React from 'react'

interface DexData {
  name: string
  price: string
  reserves: string
  isBest?: boolean
}

const DexSummary: React.FC = () => {
  // Logo configuration mapping DEX names to their images
  const dexLogoConfig: Record<string, string> = {
    curve: '/assets/curve.png',
    uniswap: '/assets/uniswap.png',
    sushiswap: '/assets/sushiswap.png',
  }

  const getDexLogo = (dexName: string): string => {
    const lowercaseName = dexName.toLowerCase()
    return dexLogoConfig[lowercaseName] || '/icons/default-token.svg'
  }

  // Hardcoded DEX until we can get real data
  const dexData: DexData[] = [
    {
      name: 'Curve',
      price: '$4,200',
      reserves: '19,250 USDT/81.5 WETH',
      isBest: true,
    },
    {
      name: 'UniSwap',
      price: '$4,200',
      reserves: '19,250 USDT/81.5 WETH',
    },
    {
      name: 'SushiSwap',
      price: '$4,200',
      reserves: '19,250 USDT/81.5 WETH',
    },
  ]

  return (
    <div className="w-full flex flex-col gap-4 py-4">
      <div className="grid grid-cols-3 gap-4 text-white72 text-[14px] font-medium">
        <div>DEX Sources</div>
        <div className="text-center">Price</div>
        <div className="text-right">Reserves</div>
      </div>

      <div className="flex flex-col gap-1">
        {dexData.map((dex, index) => (
          <div key={index} className="grid grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-1.5">
              {dex.isBest && (
                <span className="text-[#40f798] text-[14px]">Best:</span>
              )}
              <div className="relative">
                <Image
                  src={getDexLogo(dex.name)}
                  alt={dex.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              </div>
              <span className="text-white text-[14px]">{dex.name}</span>
            </div>

            <div className="text-center text-white text-[14px]">
              {dex.price}
            </div>

            <div className="text-right text-white text-[14px]">
              {dex.reserves}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DexSummary
