import { useState, useEffect, useMemo } from 'react'
import { Search, ArrowRight, X } from 'lucide-react'
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
import { Trade } from '@/app/lib/types/trade'
import { useScreenSize } from '@/app/lib/hooks/useScreenSize'

type SortField = 'streams' | 'output' | 'volume' | null
type SortDirection = 'asc' | 'desc' | null

interface TradesTableProps {
  selectedTrade: Trade | null
  selectedVolume: number | null
  isChartFiltered: boolean
  onClearSelection: () => void
}

// Helper function to get timestamp for relative dates
const getTimestamp = (daysAgo: number): number => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.getTime()
}

const tableData: Trade[] = [
  {
    invoice: 'INV001',
    action: 'INSTASETTLE',
    amount1: '$4.56',
    amount2: '$56.78',
    quantity: '40',
    duration: '4 mins',
    value: '$1,551',
    isOwner: true,
    timestamp: getTimestamp(0), // Today
  },
  {
    invoice: 'INV002',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$43.65',
    quantity: '30',
    duration: '6 mins',
    value: '$1,200',
    isOwner: false,
    timestamp: getTimestamp(2), // 2 days ago
  },
  {
    invoice: 'INV003',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$37.65',
    quantity: '30',
    duration: '6 mins',
    value: '$2,200',
    isOwner: true,
    timestamp: getTimestamp(5), // 5 days ago
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
    timestamp: getTimestamp(15), // 15 days ago
  },
  {
    invoice: 'INV005',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$22.65',
    quantity: '30',
    duration: '6 mins',
    value: '$4,200',
    isOwner: false,
    timestamp: getTimestamp(200), // 200 days ago
  },
]

const SortIcon = ({
  active,
  direction,
}: {
  active: boolean
  direction: 'asc' | 'desc' | null
}) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`ml-2 ${
      active ? 'opacity-100' : 'opacity-50'
    } group-hover:opacity-100`}
  >
    <path
      d="M6 0L3 4H9L6 0Z"
      fill={direction === 'asc' && active ? '#41fcb4' : 'currentColor'}
    />
    <path
      d="M6 12L3 8H9L6 12Z"
      fill={direction === 'desc' && active ? '#41fcb4' : 'currentColor'}
    />
  </svg>
)

const TradesTable = ({
  selectedTrade,
  selectedVolume,
  isChartFiltered,
  onClearSelection,
}: TradesTableProps) => {
  const [activeTab, setActiveTab] = useState('all')
  const timeframes = ['1D', '1W', '1M', '1Y', 'ALL']
  const [activeTimeframe, setActiveTimeframe] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [initialStream, setInitialStream] = useState<Stream | undefined>(
    undefined
  )
  const { isMobile, isTablet } = useScreenSize()
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  // Reset filters and sorting when chart selection changes
  useEffect(() => {
    if (isChartFiltered) {
      setActiveTab('all')
      setActiveTimeframe('ALL')
      setSortField(null)
      setSortDirection(null)
    }
  }, [isChartFiltered])

  const handleSort = (field: SortField) => {
    if (!isChartFiltered) {
      if (sortField === field) {
        // Toggle direction if same field
        if (sortDirection === 'asc') setSortDirection('desc')
        else if (sortDirection === 'desc') {
          setSortField(null)
          setSortDirection(null)
        }
      } else {
        // New field, start with ascending
        setSortField(field)
        setSortDirection('asc')
      }
    }
  }

  // Filter and sort trades
  const filteredAndSortedTrades = useMemo(() => {
    if (isChartFiltered) {
      return selectedTrade ? [selectedTrade] : []
    }

    let trades = [...tableData]

    // Apply timeframe filter
    const now = Date.now()
    const filterByTime = (trade: Trade) => {
      switch (activeTimeframe) {
        case '1D':
          return now - trade.timestamp <= 24 * 60 * 60 * 1000
        case '1W':
          return now - trade.timestamp <= 7 * 24 * 60 * 60 * 1000
        case '1M':
          return now - trade.timestamp <= 30 * 24 * 60 * 60 * 1000
        case '1Y':
          return now - trade.timestamp <= 365 * 24 * 60 * 60 * 1000
        case 'ALL':
          return true
        default:
          return true
      }
    }

    trades = trades.filter(filterByTime)

    // Apply ownership filter
    if (activeTab === 'myInstasettles') {
      trades = trades.filter((trade) => trade.isOwner)
    }

    // Apply sorting
    if (sortField && sortDirection) {
      trades.sort((a, b) => {
        let compareA: number, compareB: number

        switch (sortField) {
          case 'streams':
            compareA = parseInt(a.quantity)
            compareB = parseInt(b.quantity)
            break
          case 'output':
            compareA = parseFloat(a.amount2.replace('$', ''))
            compareB = parseFloat(b.amount2.replace('$', ''))
            break
          case 'volume':
            compareA = parseFloat(a.value.replace('$', '').replace(',', ''))
            compareB = parseFloat(b.value.replace('$', '').replace(',', ''))
            break
          default:
            return 0
        }

        return sortDirection === 'asc'
          ? compareA - compareB
          : compareB - compareA
      })
    }

    return trades
  }, [
    activeTab,
    activeTimeframe,
    isChartFiltered,
    selectedTrade,
    sortField,
    sortDirection,
  ])

  const displayData = filteredAndSortedTrades

  const handleStreamClick = (item: Trade) => {
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
      {(isMobile || isTablet) && selectedVolume !== null && (
        <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex items-center mb-3">
          <div className="flex gap-[6px] items-center py-[6px] sm:py-[10px] px-[6px] sm:px-[9px] rounded-[8px]">
            <span>Trade Volume: ${selectedVolume}</span>
            <button
              onClick={onClearSelection}
              className="hover:text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex gap-[6px]">
            <div
              className={`flex gap-[6px] items-center py-[6px] sm:py-[10px] bg-opacity-[12%] px-[6px] sm:px-[9px] cursor-pointer rounded-[8px] ${
                activeTab === 'all'
                  ? ' bg-primaryGradient text-black'
                  : 'hover:bg-tabsGradient'
              } ${
                isChartFiltered
                  ? 'opacity-50 pointer-events-none cursor-not-allowed'
                  : ''
              }`}
              onClick={() => {
                if (!isChartFiltered) {
                  setActiveTab('all')
                }
              }}
            >
              ALL
            </div>
            <div
              className={`flex gap-[6px] items-center py-[6px] sm:py-[10px] bg-opacity-[12%] px-[6px] sm:px-[9px] cursor-pointer rounded-[8px] ${
                activeTab === 'myInstasettles'
                  ? ' bg-primaryGradient text-black'
                  : 'hover:bg-tabsGradient'
              } ${
                isChartFiltered
                  ? 'opacity-50 pointer-events-none cursor-not-allowed'
                  : ''
              }`}
              onClick={() => {
                if (!isChartFiltered) {
                  setActiveTab('myInstasettles')
                }
              }}
            >
              MY INSTASETTLES
            </div>
          </div>

          {!(isMobile || isTablet) &&
            isChartFiltered &&
            selectedVolume !== null && (
              <div className="w-fit h-10 border border-primary px-[6px] py-[3px] rounded-[12px] flex items-center">
                <div className="flex gap-[6px] items-center py-[6px] sm:py-[10px] px-[6px] sm:px-[9px] rounded-[8px]">
                  <span>Trade Volume: ${selectedVolume}</span>
                  <button
                    onClick={onClearSelection}
                    className="hover:text-primary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
        </div>

        <div className="flex justify-between items-center mb-6 h-10">
          <div className="flex items-center gap-2">
            <div
              className={`flex rounded-lg p-1 border border-primary h-10 ${
                isChartFiltered
                  ? 'opacity-50 pointer-events-none cursor-not-allowed'
                  : ''
              }`}
            >
              {timeframes.map((timeframe, index) => (
                <button
                  key={`${timeframe}-${index}`}
                  onClick={() =>
                    !isChartFiltered && setActiveTimeframe(timeframe)
                  }
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
              <TableHead
                className="text-center cursor-pointer group"
                onClick={() => handleSort('output')}
              >
                <div className="flex items-center justify-center">
                  Output
                  <SortIcon
                    active={sortField === 'output'}
                    direction={sortField === 'output' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer group"
                onClick={() => handleSort('streams')}
              >
                <div className="flex items-center justify-center">
                  Streams
                  <SortIcon
                    active={sortField === 'streams'}
                    direction={sortField === 'streams' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead className="text-center">EST. Time</TableHead>
              <TableHead
                className="text-center cursor-pointer group"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center justify-center">
                  Swap Volume
                  <SortIcon
                    active={sortField === 'volume'}
                    direction={sortField === 'volume' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead className="text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((item, index) => (
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
        />
      )}
    </div>
  )
}

export default TradesTable
