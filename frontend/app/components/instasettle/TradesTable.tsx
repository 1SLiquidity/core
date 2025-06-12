import { useState } from 'react'
import { Search, ArrowRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Button from '../button'
import { MOCK_STREAMS } from '@/app/lib/constants/streams'
import Image from 'next/image'
import GlobalStreamSidebar from '../sidebar/globalStreamSidebar'
import { Stream } from '@/app/lib/types/stream'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const tableData = [
  {
    invoice: 'INV001',
    action: 'INSTASETTLE',
    amount1: '$4.56',
    amount2: '$56.78',
    quantity: '40',
    duration: '4 mins',
    value: '$1,551',
    isOwner: true,
  },
  {
    invoice: 'INV002',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$47.65',
    quantity: '30',
    duration: '6 mins',
    value: '$1,200',
    isOwner: false,
  },
  {
    invoice: 'INV003',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$47.65',
    quantity: '30',
    duration: '6 mins',
    value: '$2,200',
    isOwner: true,
  },
  {
    invoice: 'INV004',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$47.65',
    quantity: '30',
    duration: '6 mins',
    value: '$3,200',
    isOwner: true,
  },
  {
    invoice: 'INV005',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$47.65',
    quantity: '30',
    duration: '6 mins',
    value: '$4,200',
    isOwner: false,
  },
]

const TradesTable = () => {
  const [activeTab, setActiveTab] = useState('all')
  const timeframes = ['1D', '1W', '1M', '1Y', 'ALL']
  const tabs = ['ALL', 'MY INSTASETTLES']
  const [activeTimeframe, setActiveTimeframe] = useState('1D')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [initialStream, setInitialStream] = useState<Stream | undefined>(
    undefined
  )
  const [tradesData, setTradesData] = useState<any[]>(tableData)

  const handleStreamClick = (item: (typeof tableData)[0]) => {
    // Create a dummy stream from the table data
    const dummyStream: Stream = {
      id: item.invoice,
      fromToken: {
        symbol: 'ETH',
        amount: parseFloat(item.amount1.replace('$', '')),
        icon: '/tokens/eth.svg',
      },
      toToken: {
        symbol: 'USDC',
        estimatedAmount: parseFloat(item.amount2.replace('$', '')),
        icon: '/tokens/usdc.svg',
      },
      progress: {
        completed: 0,
        total: parseInt(item.quantity),
      },
      timeRemaining: parseInt(item.duration.split(' ')[0]), // Extract number from "4 mins"
      isInstasettle: item.action === 'INSTASETTLE',
    }
    setInitialStream(MOCK_STREAMS[0])
    setIsSidebarOpen(true)
  }

  return (
    <div className="mt-16">
      <div className="flex justify-between">
        <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex gap-[6px]">
          <div
            className={`flex gap-[6px] items-center py-[6px] sm:py-[10px] bg-opacity-[12%] px-[6px] sm:px-[9px] cursor-pointer rounded-[8px] ${
              activeTab === 'all'
                ? ' bg-primaryGradient text-black'
                : 'hover:bg-tabsGradient'
            }`}
            onClick={() => {
              setActiveTab('all')
              setTradesData(tableData)
            }}
          >
            ALL
          </div>
          <div
            className={`flex gap-[6px] items-center py-[6px] sm:py-[10px] bg-opacity-[12%] px-[6px] sm:px-[9px] cursor-pointer rounded-[8px] ${
              activeTab === 'myInstasettles'
                ? ' bg-primaryGradient text-black'
                : 'hover:bg-tabsGradient'
            }`}
            onClick={() => {
              setActiveTab('myInstasettles')
              setTradesData(tableData.filter((item) => item.isOwner))
            }}
          >
            MY INSTASETTLES
          </div>
        </div>

        {/* Main Content */}
        <div className="flex justify-between items-center mb-6 h-10">
          <div className="flex items-center gap-2">
            {/* Timeframe Buttons */}
            <div className="flex rounded-lg p-1 border border-primary h-10">
              {timeframes.map((timeframe, index) => (
                <button
                  key={`${timeframe}-${index}`}
                  onClick={() => setActiveTimeframe(timeframe)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md h-full text-xs transition-colors ${
                    activeTimeframe === timeframe
                      ? 'bg-zinc-700 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {timeframe}
                </button>
              ))}
            </div>

            {/* Search */}
            {/* <div className="relative h-10 max-md:hidden">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-600 w-4 h-4" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border border-primary h-full rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-zinc-600 w-64"
              />
            </div> */}
          </div>
        </div>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Token Pair</TableHead>
              <TableHead></TableHead>
              <TableHead className="text-center">Input</TableHead>
              <TableHead className="text-center">Output</TableHead>
              <TableHead className="text-center">Streams</TableHead>
              <TableHead className="text-center">EST. Time</TableHead>
              <TableHead className="text-center">Swap Volume</TableHead>
              <TableHead className="text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tradesData.map((item, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium text-center">
                  {/* {item.invoice} */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/tokens/eth.svg"
                        width={32}
                        height={32}
                        className="w-6 h-6"
                        alt="eth"
                      />
                      <div>
                        <p className="text-white">ETH</p>
                        <p className="text-white52">{item.amount1}</p>
                      </div>
                    </div>
                    <Image
                      src="/icons/right-arrow.svg"
                      width={24}
                      height={24}
                      alt="to"
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <Image
                        src="/tokens/usdc.svg"
                        width={32}
                        height={32}
                        alt="usdc"
                        className="w-6 h-6"
                      />
                      <div>
                        <p className="text-white">USDC</p>
                        <p className="text-white52">{item.amount2}</p>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Button
                    text={item.action}
                    className="h-[2.15rem] hover:bg-tabsGradient"
                  />
                </TableCell>
                <TableCell className="text-center">{item.amount1}</TableCell>
                <TableCell className="text-center">{item.amount2}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-center">{item.duration}</TableCell>
                <TableCell className="text-center">{item.value}</TableCell>
                <TableCell className="text-center group">
                  <ArrowRight
                    className="h-5 w-5 text-zinc-400 group-hover:text-white cursor-pointer"
                    onClick={() => handleStreamClick(item)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {initialStream && (
        <GlobalStreamSidebar
          isOpen={isSidebarOpen}
          onClose={() => {
            setIsSidebarOpen(false)
            setInitialStream(undefined)
          }}
          initialStream={initialStream}
          //   className="top-[1rem] max-h-[95vh]"
        />
      )}
    </div>
  )
}

export default TradesTable
