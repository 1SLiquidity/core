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
import { useInView } from 'react-intersection-observer'
import { useInfiniteQuery } from '@tanstack/react-query'
import tradesApi from '@/api/trades'
import { Spinner } from '../ui/spinner'

const LIMIT = 10

type SortField = 'streams' | 'output' | 'volume' | 'timestamp' | null
type SortDirection = 'asc' | 'desc' | null

interface TradeResponse {
  trades: Trade[]
  total: number
  skip: number
  limit: number
}

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
    savings: '40',
    duration: '4 mins',
    bps: '45',
    isOwner: true,
    timestamp: getTimestamp(0), // Today
  },
  {
    invoice: 'INV002',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$43.65',
    savings: '30',
    duration: '6 mins',
    bps: '70',
    isOwner: false,
    timestamp: getTimestamp(2), // 2 days ago
  },
  {
    invoice: 'INV003',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$37.65',
    savings: '30',
    duration: '6 mins',
    bps: '30',
    isOwner: true,
    timestamp: getTimestamp(5), // 5 days ago
  },
  {
    invoice: 'INV004',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$47.65',
    savings: '30',
    duration: '6 mins',
    bps: '40',
    isOwner: true,
    timestamp: getTimestamp(15), // 15 days ago
  },
  {
    invoice: 'INV005',
    action: 'INSTASETTLE',
    amount1: '$3.21',
    amount2: '$22.65',
    savings: '30',
    duration: '6 mins',
    bps: '50',
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
  const { ref, inView } = useInView()

  const {
    data,
    status,
    error,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['trades', activeTab, activeTimeframe],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await tradesApi.fetchTrades(LIMIT, pageParam * LIMIT)
      return response
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: TradeResponse, allPages: TradeResponse[]) => {
      if (isChartFiltered) return undefined
      const nextPage =
        lastPage.trades.length === LIMIT ? allPages.length : undefined
      return nextPage
    },
    enabled: !isChartFiltered,
  })

  useEffect(() => {
    if (inView && hasNextPage && !isChartFiltered) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage, isChartFiltered])

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
  const displayData = useMemo(() => {
    console.log('selectedTrade ====>', selectedTrade)
    console.log('isChartFiltered ====>', isChartFiltered)

    // If chart is filtered, only show selected trade or nothing
    if (isChartFiltered) {
      console.log('Returning only selected trade')
      return selectedTrade ? [selectedTrade] : []
    }

    console.log('========================================')
    console.log('========== continue ==========')
    console.log('========================================')

    if (!data?.pages) return []

    let trades = data.pages.flatMap((page) => page.trades)
    console.log('Total trades after flattening:', trades.length)

    // Apply ownership filter
    if (activeTab === 'myInstasettles') {
      trades = trades.filter((trade) => trade.isOwner)
      console.log('Trades after ownership filter:', trades.length)
    }

    // Apply timeframe filter
    const now = Date.now()
    trades = trades.filter((trade) => {
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
    })
    console.log('Trades after timeframe filter:', trades.length)

    // Apply sorting
    if (sortField && sortDirection) {
      trades.sort((a, b) => {
        let compareA: number, compareB: number

        switch (sortField) {
          case 'streams':
            compareA = parseInt(a.savings)
            compareB = parseInt(b.savings)
            break
          case 'output':
            compareA = parseFloat(a.amount2.replace('$', ''))
            compareB = parseFloat(b.amount2.replace('$', ''))
            break
          case 'volume':
            compareA = parseFloat(a.bps)
            compareB = parseFloat(b.bps)
            break
          case 'timestamp':
            compareA = a.timestamp
            compareB = b.timestamp
            break
          default:
            return 0
        }

        return sortDirection === 'asc'
          ? compareA - compareB
          : compareB - compareA
      })
      console.log('Trades after sorting:', trades.length)
    }

    return trades
  }, [
    data?.pages,
    activeTab,
    activeTimeframe,
    isChartFiltered,
    selectedTrade,
    sortField,
    sortDirection,
  ])

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
        total: parseInt(item.savings),
      },
      timeRemaining: parseInt(item.duration.split(' ')[0]), // Extract number from "4 mins"
      isInstasettle: item.action === 'INSTASETTLE',
    }
    setInitialStream(MOCK_STREAMS[0])
    setIsSidebarOpen(true)
  }

  if (status === 'error') {
    return (
      <div className="text-red-500">
        Error loading trades: {(error as Error).message}
      </div>
    )
  }

  return (
    <div className="mt-16">
      <div className="flex justify-between mb-6">
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
        </div>
        {isChartFiltered && selectedVolume !== null && (
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

      <ScrollArea className="w-full whitespace-nowrap">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow>
              <TableHead className="text-center">Token Pair</TableHead>
              <TableHead></TableHead>
              <TableHead className="text-center">Volume</TableHead>
              <TableHead
                className="text-center cursor-pointer group"
                onClick={() => handleSort('output')}
              >
                <div className="flex items-center justify-center">
                  Effective Price
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
                  Savings
                  <SortIcon
                    active={sortField === 'streams'}
                    direction={sortField === 'streams' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer group"
                onClick={() => handleSort('volume')}
              >
                <div className="flex items-center justify-center">
                  BPS
                  <SortIcon
                    active={sortField === 'volume'}
                    direction={sortField === 'volume' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead
                className="text-center cursor-pointer group"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center justify-center">
                  Timestamp
                  <SortIcon
                    active={sortField === 'timestamp'}
                    direction={sortField === 'timestamp' ? sortDirection : null}
                  />
                </div>
              </TableHead>
              <TableHead className="text-center"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((item, index) => (
              <TableRow key={item.invoice}>
                <TableCell className="font-medium text-center">
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
                <TableCell className="text-center">${item.savings}</TableCell>
                <TableCell className="text-center">{item.bps}</TableCell>
                <TableCell className="text-center">{item.duration}</TableCell>
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

      {/* Intersection Observer target */}
      {!isChartFiltered && hasNextPage && (
        <div ref={ref}>
          {isFetchingNextPage && (
            <Spinner className="flex justify-center items-center" />
          )}
        </div>
      )}

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
