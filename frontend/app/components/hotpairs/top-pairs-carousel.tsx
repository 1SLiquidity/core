'use client'

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import PairCard from './PairCard'

export default function TopPairsCarousel({
  topHotPairs,
  activeHotPair,
  setActiveHotPair,
}: {
  topHotPairs: any
  activeHotPair: any
  setActiveHotPair: any
}) {
  return (
    <div className="dark bg-gray-950 my-20">
      <div
        className="mx-auto max-w-6xl rounded-lg border border-[#003E49] p-8"
        style={{
          background:
            'linear-gradient(90deg, rgba(0, 10, 16, 0.7) 0%, rgba(0, 22, 28, 0.49) 100%)',
        }}
      >
        <h1 className="text-3xl font-bold text-white mb-8">Top Savers</h1>

        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {topHotPairs.map((pair: any, index: number) => (
              <CarouselItem
                key={index}
                className="pl-2 md:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <div className="cursor-pointer">
                  <PairCard
                    pair={pair}
                    onClick={setActiveHotPair}
                    isActive={activeHotPair?.id === pair.id}
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
