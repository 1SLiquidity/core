'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Rectangle,
} from 'recharts'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import TradesTable from './TradesTable'
import { ChartDataPoint, Trade } from '@/app/lib/types/trade'
import tradesApi from '@/api/trades'
import { Spinner } from '../ui/spinner'

const ITEMS_PER_PAGE = 20

const chartConfig = {
  streams: {
    label: 'Streams',
  },
} satisfies ChartConfig

export default function TradesChart() {
  const [activeBar, setActiveBar] = useState<number | null>(null)
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Setup intersection observer with options
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '0px 400px 0px 0px', // Trigger earlier before reaching the edge
  })

  // Filter states
  const [selectedTopN, setSelectedTopN] = useState<string>('all')

  // React Query infinite scroll setup
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['trades', selectedTopN],
    queryFn: async ({ pageParam = 0 }) => {
      console.log('Fetching page:', pageParam, 'selectedTopN:', selectedTopN)

      // If specific number selected, return exactly that many items
      if (selectedTopN !== 'all') {
        const limit = parseInt(selectedTopN)
        const response = await tradesApi.fetchTrades(limit, 0)
        return {
          ...response,
          hasMore: false,
        }
      }

      const response = await tradesApi.fetchTrades(
        ITEMS_PER_PAGE,
        pageParam * ITEMS_PER_PAGE
      )
      return {
        ...response,
        hasMore: response.trades.length === ITEMS_PER_PAGE,
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // Only enable infinite scroll for 'all' and if there's more data
      if (selectedTopN !== 'all' || !lastPage.hasMore) return undefined
      return allPages.length
    },
    initialPageParam: 0,
  })

  // Handle intersection observer
  useEffect(() => {
    if (
      inView &&
      hasNextPage &&
      selectedTopN === 'all' &&
      !isFetchingNextPage
    ) {
      console.log('Loading more data...', {
        inView,
        hasNextPage,
        selectedTopN,
        isFetchingNextPage,
      })
      fetchNextPage()
    }
  }, [inView, hasNextPage, fetchNextPage, selectedTopN, isFetchingNextPage])

  // Combine all pages of data into chart data points
  const allChartData = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) =>
      page.trades.map(
        (trade: Trade): ChartDataPoint => ({
          volume: parseFloat(trade.bps),
          streams: parseInt(trade.savings),
          trade,
        })
      )
    )
  }, [data?.pages])

  // Sort all chart data
  const sortedChartData = useMemo(() => {
    // For top N selections, data comes pre-sorted
    if (selectedTopN !== 'all') return allChartData
    // For 'all', sort by volume
    return [...allChartData].sort((a, b) => a.volume - b.volume)
  }, [allChartData, selectedTopN])

  // Calculate container width based on data length
  const containerWidth = useMemo(() => {
    const minWidth = 1200
    const barWidth = 40 // width per bar
    const padding = 200 // increased padding for better scroll detection
    const calculatedWidth = Math.max(
      minWidth,
      sortedChartData.length * barWidth + padding
    )
    console.log(
      'Container width:',
      calculatedWidth,
      'Data length:',
      sortedChartData.length
    )
    return calculatedWidth
  }, [sortedChartData.length])

  const getBarProps = useCallback(
    (index: number) => ({
      fill:
        activeBar === index || selectedBar === index ? '#0f4e35' : '#41fcb4',
      style: {
        transition: 'fill 0.2s ease',
      },
    }),
    [activeBar, selectedBar]
  )

  const handleBarClick = (data: ChartDataPoint, index: number) => {
    if (!isChartReady) return
    setSelectedBar(selectedBar === index ? null : index)
    if (selectedBar !== index) {
      console.log('Selected Bar Details:', {
        volume: data.volume,
        streams: data.streams,
        trade: data.trade,
      })
    }
  }

  // Set chart ready when initial data is available
  useEffect(() => {
    console.log('Chart ready check:', {
      status,
      pagesLength: data?.pages?.length,
    })
    if (status === 'success' && data?.pages?.length > 0) {
      setIsChartReady(true)
    }
  }, [status, data?.pages?.length])

  // Handle value change for the dropdown
  const handleValueChange = (value: string) => {
    setSelectedBar(null) // Reset selected bar when changing view
    setActiveBar(null) // Reset active bar when changing view
    setSelectedTopN(value)
  }

  if (!isChartReady) {
    console.log('Chart not ready yet')
    return null
  }

  return (
    <div className="mt-32 mb-16">
      <div className="dark">
        <div className="w-full bg-background text-foreground">
          <div className="mb-6 flex flex-col md:flex-row gap-4 md:gap-0 justify-between items-center">
            <h2 className="text-2xl font-bold">
              Top Trades (${Math.min(...sortedChartData.map((d) => d.volume))} -
              ${Math.max(...sortedChartData.map((d) => d.volume))})
            </h2>

            <Select value={selectedTopN} onValueChange={handleValueChange}>
              <SelectTrigger className="w-[180px] bg-transparent border border-primary hover:bg-tabsGradient transition-colors">
                <SelectValue placeholder="Select trades" />
              </SelectTrigger>
              <SelectContent className="bg-black border border-primary">
                <SelectItem
                  value="10"
                  className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                >
                  Top 10 Trades
                </SelectItem>
                <SelectItem
                  value="20"
                  className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                >
                  Top 20 Trades
                </SelectItem>
                <SelectItem
                  value="30"
                  className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                >
                  Top 30 Trades
                </SelectItem>
                <SelectItem
                  value="all"
                  className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                >
                  All Trades
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fixed Chart Container */}
          <div className="relative">
            <div
              ref={containerRef}
              className="overflow-x-auto chart-scroll rounded-2xl"
              style={{
                width: '100%',
                height: '500px',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${containerWidth}px`,
                  height: '100%',
                  position: 'relative',
                }}
              >
                {/* bg-[#08160e] */}
                {/* bg-[#0c1d13] */}
                {/* <div className="h-full w-full bg-[#08160e] absolute top-0 left-0 rounded-2xl" /> */}
                <div
                  className="h-64 w-full bg-gradient-to-br from-[#114532] to-[#22432e] absolute bottom-0 left-0 rounded-2xl"
                  style={{
                    WebkitMaskImage:
                      'linear-gradient(to top, #ffffff 0%, transparent 100%)',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: '100% 100%',
                    maskImage:
                      'linear-gradient(to top, #ffffff 0%, transparent 100%)',
                    maskRepeat: 'no-repeat',
                    maskSize: '100% 100%',
                  }}
                />

                {/* [mask-image:linear-gradient(to_top,black_70%,transparent_100%)] */}
                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full relative"
                >
                  <BarChart
                    data={sortedChartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 20,
                    }}
                    onMouseMove={(state) => {
                      if (state?.activeTooltipIndex !== undefined) {
                        setActiveBar(state.activeTooltipIndex)
                      }
                    }}
                    onMouseLeave={() => {
                      setActiveBar(null)
                    }}
                    onClick={(data) => {
                      if (data && data.activeTooltipIndex !== undefined) {
                        handleBarClick(
                          sortedChartData[data.activeTooltipIndex],
                          data.activeTooltipIndex
                        )
                      }
                    }}
                  >
                    {/* <CartesianGrid
                      strokeDasharray="3 3"
                      // stroke="hsl(var(--border))"
                      stroke="#181818"
                      strokeWidth={1}
                      vertical={true}
                      horizontal={true}
                    /> */}
                    <XAxis
                      dataKey="volume"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `$${value}`}
                      label={{
                        bps: 'Volume',
                        position: 'insideBottom',
                        offset: -10,
                      }}
                    />
                    <Bar
                      dataKey="streams"
                      radius={8}
                      activeIndex={(selectedBar || activeBar) ?? undefined}
                      activeBar={({ ...props }) => {
                        return (
                          <Rectangle
                            {...props}
                            fillOpacity={0.8}
                            stroke={'#646363'}
                            strokeWidth={1}
                            strokeDasharray={4}
                            strokeDashoffset={4}
                            strokeLinecap="round"
                          />
                        )
                      }}
                    >
                      {sortedChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getBarProps(index).fill}
                          style={getBarProps(index).style}
                        />
                      ))}
                    </Bar>
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-white005 bg-black p-3 shadow-md">
                              <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Volume:
                                  </span>
                                  <span className="text-sm font-bold">
                                    ${label}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">
                                    Streams:
                                  </span>
                                  <span className="text-sm font-bold">
                                    {payload[0].value}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                  </BarChart>
                </ChartContainer>

                {/* Intersection Observer target */}
                {selectedTopN === 'all' && hasNextPage && (
                  <div
                    ref={ref}
                    className="absolute right-0 top-0 bottom-0 w-40"
                    style={{
                      pointerEvents: 'none',
                    }}
                  >
                    {isFetchingNextPage && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <Spinner />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <TradesTable
        selectedTrade={
          selectedBar !== null ? sortedChartData[selectedBar].trade : null
        }
        selectedVolume={
          selectedBar !== null ? sortedChartData[selectedBar].volume : null
        }
        isChartFiltered={selectedBar !== null}
        onClearSelection={() => setSelectedBar(null)}
      />
    </div>
  )
}
