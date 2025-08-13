import Button from '../button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const tradingPairs = [
  {
    id: 1,
    pair: 'ETH / USDC',
    volume: '$ 24,000',
    winRate: '20%',
    savings: '$ 300.12',
  },
  {
    id: 2,
    pair: 'ETH / USDC',
    volume: '$ 24,000',
    winRate: '20%',
    savings: '$ 300.12',
  },
  {
    id: 3,
    pair: 'ETH / USDC',
    volume: '$ 24,000',
    winRate: '20%',
    savings: '$ 300.12',
  },
  {
    id: 4,
    pair: 'ETH / USDC',
    volume: '$ 24,000',
    winRate: '20%',
    savings: '$ 300.12',
  },
  {
    id: 5,
    pair: 'ETH / USDC',
    volume: '$ 24,000',
    winRate: '20%',
    savings: '$ 300.12',
  },
  {
    id: 6,
    pair: 'ETH / USDC',
    volume: '$ 24,000',
    winRate: '20%',
    savings: '$ 300.12',
  },
]

export default function PairsTable() {
  return (
    <div className="dark bg-gray-950 my-10">
      <div className="mx-auto max-w-6xl rounded-lg border border-neutral-800 p-8">
        <h1 className="text-3xl font-bold text-white mb-8">All Pairs</h1>

        <div className="rounded-lg border border-neutral-900 bg-gray-900/50 backdrop-blur">
          <ScrollArea className="w-full whitespace-nowrap">
            <Table className="overflow-hidden">
              <TableHeader className="overflow-hidden hover:bg-transparent">
                <TableRow className="!border-neutral-900 overflow-hidden hover:bg-transparent">
                  <TableHead className="text-left">Token Pair</TableHead>
                  <TableHead className="text-center">24h Volume</TableHead>
                  <TableHead className="text-center">% Win</TableHead>
                  <TableHead className="text-center">Est. Savings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tradingPairs.map((pair) => (
                  <TableRow
                    key={pair.id}
                    // className="border-neutral-900 hover:bg-neutral-800/30"
                  >
                    <TableCell className="font-medium text-center group">
                      <div className="flex items-center gap-4 w-full justify-start">
                        <div
                          className={cn(
                            'flex items-center transition-all duration-300'
                          )}
                        >
                          {/* Ethereum icon */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] z-10">
                            <Image
                              src="/tokens/eth.svg"
                              alt="eth"
                              width={20}
                              height={20}
                              className="w-full h-full"
                            />
                          </div>
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 transition-all duration-300'
                            )}
                          >
                            <Image
                              src={'/tokens/usdc.svg'}
                              alt="dai"
                              width={20}
                              height={20}
                              className="w-full h-full"
                            />
                          </div>
                        </div>
                        <Button
                          text="TRADE NOW"
                          className="h-9 max-w-14 text-[#40f798]"
                        />
                      </div>

                      {/* <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image
                            src={'/tokens/eth.svg'}
                            width={32}
                            height={32}
                            className="w-6 h-6"
                            alt={'eth'}
                          />
                          <Image
                            src={'/tokens/usdc.svg'}
                            width={32}
                            height={32}
                            alt={'usdc'}
                            className="w-6 h-6"
                          />

                          <Button text="TRADE NOW" className="h--10" />
                        </div>
                      </div> */}
                    </TableCell>

                    <TableCell className="text-center">{pair.volume}</TableCell>
                    <TableCell className="text-center">
                      {pair.winRate}
                    </TableCell>

                    <TableCell className="text-center">
                      {pair.savings}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
