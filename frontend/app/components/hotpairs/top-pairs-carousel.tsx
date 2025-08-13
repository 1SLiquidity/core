'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import PairCard from './PairCard'

const hotPairs = [
  {
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/weth.webp',
    pair: 'USDT / WETH',
    price: 1000,
    vol: 1000,
    win: 10,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: true,
  },
  {
    icon1: '/tokens/usdc.svg',
    icon2: '/tokens/weth.webp',
    pair: 'USDC / WETH',
    price: 2000,
    vol: 1000,
    win: 20,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
  {
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/usdc.svg',
    pair: 'USDT / USDC',
    price: 3000,
    vol: 1000,
    win: 15,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
  {
    icon1: '/tokens/usdc.svg',
    icon2: '/tokens/weth.webp',
    pair: 'USDC / WETH',
    price: 2000,
    vol: 1000,
    win: 20,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
  {
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/usdc.svg',
    pair: 'USDT / USDC',
    price: 3000,
    vol: 1000,
    win: 15,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
  {
    icon1: '/tokens/usdc.svg',
    icon2: '/tokens/weth.webp',
    pair: 'USDC / WETH',
    price: 2000,
    vol: 1000,
    win: 20,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
  {
    icon1: '/tokens/usdt.webp',
    icon2: '/tokens/usdc.svg',
    pair: 'USDT / USDC',
    price: 3000,
    vol: 1000,
    win: 15,
    save: 1000,
    details1: '1,000 USDT - 5.2%',
    details2: 'in est. savings',
    isActive: false,
  },
]

export default function TopPairsCarousel() {
  return (
    <div className="dark bg-gray-950 my-20">
      <div
        className="mx-auto max-w-6xl rounded-lg border border-[#003E49] p-8"
        style={{
          background:
            'linear-gradient(90deg, rgba(0, 10, 16, 0.7) 0%, rgba(0, 22, 28, 0.49) 100%)',
        }}
      >
        <h1 className="text-3xl font-bold text-white mb-8">
          Top Pairs (Filtered)
        </h1>

        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {hotPairs.map((pair, index) => (
              <CarouselItem
                key={index}
                className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
              >
                <div className="cursor-pointer">
                  <PairCard
                    icon1={pair.icon1}
                    icon2={pair.icon2}
                    pair={pair.pair}
                    price={pair.price}
                    vol={pair.vol}
                    win={pair.win}
                    isActive={false}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-12 bg-[#0c3526] border-neutral-900 text-white hover:bg-[#40FAAC] hover:text-black z-[55555]" />
          <CarouselNext className="-right-12 bg-[#114532] border-neutral-900 text-white hover:bg-[#40FAAC] hover:text-black z-[55555]" />
        </Carousel>
      </div>
    </div>
  )
}
