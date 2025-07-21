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
import { useQuery } from '@tanstack/react-query'
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

const DEFAULT_RECORDS = 100

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
  const chartContainerRef = useRef<HTMLDivElement>(null)

  // Filter states - default to 'all'
  const [selectedTopN, setSelectedTopN] = useState<string>('all')

  // React Query setup
  const { data, status, refetch } = useQuery({
    queryKey: ['trades', selectedTopN],
    queryFn: async () => {
      const limit =
        selectedTopN === 'all' ? DEFAULT_RECORDS : parseInt(selectedTopN)
      const response = await tradesApi.fetchTrades(limit, 0)
      return response
    },
  })

  // Combine data into chart data points
  const chartData = useMemo(() => {
    if (!data?.trades) return []
    return data.trades.map(
      (trade: Trade): ChartDataPoint => ({
        volume: parseFloat(trade.bps),
        streams: parseInt(trade.savings),
        trade,
      })
    )
  }, [data?.trades])

  // Sort chart data
  const sortedChartData = useMemo(() => {
    return [...chartData].sort((a, b) => a.volume - b.volume)
  }, [chartData])

  // Calculate container width based on data length
  const containerWidth = useMemo(() => {
    const minWidth = 1200
    const barWidth = 40 // width per bar
    const padding = 200 // padding for better visualization
    const calculatedWidth = Math.max(
      minWidth,
      sortedChartData.length * barWidth + padding
    )
    return calculatedWidth
  }, [sortedChartData.length])

  const getBarProps = useCallback(
    (index: number) => ({
      fill:
        activeBar === index || selectedBar === index ? '#00e0ff' : '#41fcb4',
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

  // Set chart ready when data is available
  useEffect(() => {
    if (status === 'success' && data?.trades?.length > 0) {
      setIsChartReady(true)
    }
  }, [status, data?.trades?.length])

  // Handle value change for the dropdown
  const handleValueChange = (value: string) => {
    setSelectedBar(null) // Reset selected bar when changing view
    setActiveBar(null) // Reset active bar when changing view
    setSelectedTopN(value)
  }

  // Handle scroll event
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current
    const scrollPercentage = (scrollLeft / (scrollWidth - clientWidth)) * 100
    // setScrollPosition(scrollPercentage) // This state is no longer needed
  }, [])

  // Add scroll event listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  if (!isChartReady) {
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
                  value="50"
                  className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                >
                  Top 50 Trades
                </SelectItem>
                <SelectItem
                  value="all"
                  className="hover:bg-tabsGradient hover:text-white cursor-pointer"
                >
                  All Trades (100)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chart Container */}
          <div className="relative" ref={chartContainerRef}>
            {/* Edge fade effect */}
            <div
              className="absolute left-0 top-0 bottom-[35px] w-28 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to right, black, rgba(0, 0, 0, 0.99) 5%, rgba(0, 0, 0, 0.97) 10%, rgba(0, 0, 0, 0.95) 20%, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0.2) 85%, transparent)',
              }}
            />
            <div
              className="absolute right-0 top-0 bottom-[35px] w-28 z-10 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to left, black, rgba(0, 0, 0, 0.99) 5%, rgba(0, 0, 0, 0.97) 10%, rgba(0, 0, 0, 0.95) 20%, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.8) 40%, rgba(0, 0, 0, 0.6) 60%, rgba(0, 0, 0, 0.2) 85%, transparent)',
              }}
            />

            {/* Top fade mask - keeping this as it adds depth */}
            <div
              className="absolute inset-0 bg-black pointer-events-none"
              style={{
                WebkitMaskImage: `
          radial-gradient(circle at top, transparent 0%, black 30%)`,
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center',
                WebkitMaskSize: 'cover',
                maskImage: `
          radial-gradient(circle at top, transparent 0%, black 30%)`,
                maskRepeat: 'no-repeat',
                maskPosition: 'center',
                maskSize: 'cover',
              }}
            />

            <div
              ref={containerRef}
              className="overflow-x-auto chart-scroll relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              style={{
                width: '100%',
                height: '500px',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div
                style={{
                  width: `${containerWidth}px`,
                  height: '100%',
                  position: 'relative',
                }}
              >
                {/* Background gradient */}
                <div
                  className="w-full h-64 bg-gradient-to-br from-[#114532] to-[#22432e] absolute bottom-[35px] left-0"
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

                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full relative"
                >
                  <BarChart
                    data={sortedChartData}
                    margin={{
                      top: 20,
                      right: 50,
                      left: 80,
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
                    <XAxis
                      dataKey="volume"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={20}
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
