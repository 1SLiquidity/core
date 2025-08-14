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

export default function PairsTable({ pairsData }: { pairsData: any }) {
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
                  <TableHead className="text-center">
                    Total DEX Reserve Depth
                  </TableHead>
                  <TableHead className="text-center">
                    Max DECASlip Savings
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="text-white52 text-center py-8">
                        No pairs found
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pairsData.map((pair: any) => (
                    <TableRow key={pair.id}>
                      <TableCell className="font-medium text-center group">
                        <div className="flex items-center gap-8 w-full justify-start">
                          <div className="flex items-center gap-4 justify-start">
                            <div
                              className={cn(
                                'flex items-center transition-all duration-300'
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
                                  'w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#827a7a33] -ml-3 transition-all duration-300'
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
                            <h2 className="text-white text-xl font-semibold min-w-[8rem] text-left">
                              {pair.pair}
                            </h2>
                          </div>

                          <Button
                            text="TRADE NOW"
                            className="h-9 max-w-14 text-[#40f798]"
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {pair.reserve}
                      </TableCell>

                      <TableCell className="text-center">{pair.save}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
