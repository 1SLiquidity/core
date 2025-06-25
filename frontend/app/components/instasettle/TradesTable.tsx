'use client'

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
import { Trade } from '@/app/lib/graphql/types/trade'
import { useScreenSize } from '@/app/lib/hooks/useScreenSize'
import { useInView } from 'react-intersection-observer'
import { useTrades } from '@/app/lib/hooks/useTrades'
import { Skeleton } from '@/components/ui/skeleton'
import { formatUnits } from 'viem'
import { useTokenList } from '@/app/lib/hooks/useTokenList'
import { TOKENS_TYPE } from '@/app/lib/hooks/useWalletTokens'
import { formatRelativeTime } from '@/app/lib/utils/time'

const LIMIT = 10

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

type SortField = 'streams' | 'output' | 'volume' | 'timestamp' | null
type SortDirection = 'asc' | 'desc' | null

interface TradesTableProps {
  selectedTrade: Trade | null
  selectedVolume: number | null
  isChartFiltered: boolean
  onClearSelection: () => void
}

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
  const [initialStream, setInitialStream] = useState<Trade | undefined>(
    undefined
  )
  const { isMobile, isTablet } = useScreenSize()
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)
  const { ref, inView } = useInView()

  // Get token list
  const { tokens: tokenList, isLoading: isLoadingTokenList } = useTokenList()

  // Use the useTrades hook for GraphQL queries
  const { trades, isLoading, error, loadMore } = useTrades({
    first: LIMIT,
    skip: 0,
  })

  useEffect(() => {
    if (inView && !isChartFiltered && !isLoading) {
      loadMore()
    }
  }, [inView, isChartFiltered, isLoading, loadMore])

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
    if (isChartFiltered) {
      return selectedTrade ? [selectedTrade] : []
    }

    if (!trades.length) return []

    let filteredTrades = [...trades]

    // Apply ownership filter
    if (activeTab === 'myInstasettles') {
      filteredTrades = filteredTrades.filter((trade) => trade.isInstasettlable)
    }

    // Apply timeframe filter
    const now = Date.now()
    filteredTrades = filteredTrades.filter((trade) => {
      const tradeDate = new Date(trade.createdAt).getTime()
      switch (activeTimeframe) {
        case '1D':
          return now - tradeDate <= 24 * 60 * 60 * 1000
        case '1W':
          return now - tradeDate <= 7 * 24 * 60 * 60 * 1000
        case '1M':
          return now - tradeDate <= 30 * 24 * 60 * 60 * 1000
        case '1Y':
          return now - tradeDate <= 365 * 24 * 60 * 60 * 1000
        case 'ALL':
        default:
          return true
      }
    })

    return filteredTrades
  }, [trades, activeTab, activeTimeframe, isChartFiltered, selectedTrade])

  const handleStreamClick = (item: Trade) => {
    setInitialStream(item)
    setIsSidebarOpen(true)
  }

  // Loading skeleton
  if (isLoading && !displayData.length) {
    return (
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead className="text-center">Token Pair</TableHead>
            <TableHead></TableHead>
            <TableHead className="text-center">Volume</TableHead>
            <TableHead className="text-center">Effective Price</TableHead>
            <TableHead className="text-center">Savings</TableHead>
            <TableHead className="text-center">bps</TableHead>
            <TableHead className="text-center">Timestamp</TableHead>
            <TableHead className="text-center"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array(5)
            .fill(0)
            .map((_, index) => (
              <TableRow key={`skeleton-${index}`}>
                <TableCell>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <div>
                        <Skeleton className="w-12 h-4 mb-1" />
                        <Skeleton className="w-16 h-4" />
                      </div>
                    </div>
                    <Skeleton className="w-4 h-2" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <div>
                        <Skeleton className="w-12 h-4 mb-1" />
                        <Skeleton className="w-16 h-4" />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="w-16 h-4" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-12 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-16 h-4 mx-auto" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="w-5 h-5 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    )
  }

  if (error) {
    return (
      <div className="text-red-500">Error loading trades: {error.message}</div>
    )
  }

  return (
    <div className="mt-16 relative">
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
                // onClick={() => handleSort('output')}
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
                // onClick={() => handleSort('streams')}
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
                // onClick={() => handleSort('volume')}
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
                // onClick={() => handleSort('timestamp')}
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
            {displayData.length === 0 && !isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="text-white52 text-center py-8">
                    No trades found
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item) => {
                // Find token information
                const tokenIn = tokenList.find(
                  (t: TOKENS_TYPE) =>
                    t.token_address.toLowerCase() === item.tokenIn.toLowerCase()
                )
                const tokenOut = tokenList.find(
                  (t: TOKENS_TYPE) =>
                    t.token_address.toLowerCase() ===
                    item.tokenOut.toLowerCase()
                )

                // Format amounts using token decimals
                const formattedAmountIn = tokenIn
                  ? formatUnits(BigInt(item.amountIn), tokenIn.decimals)
                  : '0'
                const formattedMinAmountOut = tokenOut
                  ? formatUnits(BigInt(item.minAmountOut), tokenOut.decimals)
                  : '0'

                // Calculate USD values (using token price from tokenList)
                const amountInUsd = tokenIn
                  ? Number(formattedAmountIn) * (tokenIn.usd_price || 0)
                  : 0
                const amountOutUsd = tokenOut
                  ? Number(formattedMinAmountOut) * (tokenOut.usd_price || 0)
                  : 0

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-center">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Image
                            src={tokenIn?.icon || '/tokens/eth.svg'}
                            width={32}
                            height={32}
                            className="w-6 h-6"
                            alt={tokenIn?.symbol || 'eth'}
                          />
                          <div>
                            <p className="text-white">
                              {tokenIn?.symbol || 'ETH'}
                            </p>
                            <p className="text-white52">
                              ${amountInUsd.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Image
                          src="/icons/right-arrow.svg"
                          width={24}
                          height={24}
                          alt="to"
                          className="w-4 h-4 mx-2"
                        />
                        <div className="flex items-center gap-2">
                          <Image
                            src={tokenOut?.icon || '/tokens/usdc.svg'}
                            width={32}
                            height={32}
                            alt={tokenOut?.symbol || 'usdc'}
                            className="w-6 h-6"
                          />
                          <div>
                            <p className="text-white">
                              {tokenOut?.symbol || 'USDC'}
                            </p>
                            <p className="text-white52">
                              ${amountOutUsd.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        text={item.isInstasettlable ? 'INSTASETTLE' : 'STREAM'}
                        className="h-[2.15rem] hover:bg-tabsGradient"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      ${amountInUsd.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">${6.88}</TableCell>
                    <TableCell className="text-center">
                      ${parseFloat(item.instasettleBps || '0').toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.instasettleBps || '0'}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatRelativeTime(item.createdAt)}
                    </TableCell>
                    <TableCell className="text-center group">
                      <ArrowRight
                        className="h-5 w-5 text-zinc-400 group-hover:text-white cursor-pointer"
                        onClick={() => handleStreamClick(item)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Intersection Observer target */}
      {!isChartFiltered && (
        <div ref={ref}>
          {isLoading && (
            <div className="flex justify-center items-center py-4">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
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
