'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { debounce } from 'lodash'
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
import { ChartDataPoint } from '@/app/lib/types/trade'

// Helper function to get timestamp for relative dates
const getTimestamp = (daysAgo: number): number => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.getTime()
}

const unsortedChartData: ChartDataPoint[] = [
  {
    volume: 2,
    streams: 4,
    trade: {
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
  },
  {
    volume: 15,
    streams: 12,
    trade: {
      invoice: 'INV002',
      action: 'INSTASETTLE',
      amount1: '$3.21',
      amount2: '$47.65',
      quantity: '30',
      duration: '6 mins',
      value: '$1,200',
      isOwner: false,
      timestamp: getTimestamp(2), // 2 days ago
    },
  },
  {
    volume: 45,
    streams: 8,
    trade: {
      invoice: 'INV003',
      action: 'INSTASETTLE',
      amount1: '$5.67',
      amount2: '$89.12',
      quantity: '35',
      duration: '5 mins',
      value: '$2,200',
      isOwner: true,
      timestamp: getTimestamp(5), // 5 days ago
    },
  },
  {
    volume: 120,
    streams: 25,
    trade: {
      invoice: 'INV004',
      action: 'INSTASETTLE',
      amount1: '$6.78',
      amount2: '$123.45',
      quantity: '45',
      duration: '7 mins',
      value: '$3,200',
      isOwner: false,
      timestamp: getTimestamp(15), // 15 days ago
    },
  },
  {
    volume: 230,
    streams: 18,
    trade: {
      invoice: 'INV005',
      action: 'INSTASETTLE',
      amount1: '$7.89',
      amount2: '$234.56',
      quantity: '50',
      duration: '8 mins',
      value: '$4,200',
      isOwner: true,
      timestamp: getTimestamp(20), // 20 days ago
    },
  },
  {
    volume: 380,
    streams: 35,
    trade: {
      invoice: 'INV006',
      action: 'INSTASETTLE',
      amount1: '$8.90',
      amount2: '$345.67',
      quantity: '55',
      duration: '9 mins',
      value: '$5,200',
      isOwner: false,
      timestamp: getTimestamp(25), // 25 days ago
    },
  },
  {
    volume: 560,
    streams: 28,
    trade: {
      invoice: 'INV007',
      action: 'INSTASETTLE',
      amount1: '$9.01',
      amount2: '$456.78',
      quantity: '60',
      duration: '10 mins',
      value: '$6,200',
      isOwner: true,
      timestamp: getTimestamp(30), // 30 days ago
    },
  },
  {
    volume: 667,
    streams: 42,
    trade: {
      invoice: 'INV008',
      action: 'INSTASETTLE',
      amount1: '$10.12',
      amount2: '$567.89',
      quantity: '65',
      duration: '11 mins',
      value: '$7,200',
      isOwner: false,
      timestamp: getTimestamp(45), // 45 days ago
    },
  },
  {
    volume: 850,
    streams: 38,
    trade: {
      invoice: 'INV009',
      action: 'INSTASETTLE',
      amount1: '$11.23',
      amount2: '$678.90',
      quantity: '70',
      duration: '12 mins',
      value: '$8,200',
      isOwner: true,
      timestamp: getTimestamp(60), // 60 days ago
    },
  },
  {
    volume: 900,
    streams: 55,
    trade: {
      invoice: 'INV010',
      action: 'INSTASETTLE',
      amount1: '$12.34',
      amount2: '$789.01',
      quantity: '75',
      duration: '13 mins',
      value: '$9,200',
      isOwner: false,
      timestamp: getTimestamp(90), // 90 days ago
    },
  },
  {
    volume: 250,
    streams: 18,
    trade: {
      invoice: 'INV011',
      action: 'INSTASETTLE',
      amount1: '$13.45',
      amount2: '$890.12',
      quantity: '80',
      duration: '14 mins',
      value: '$10,200',
      isOwner: true,
      timestamp: getTimestamp(0), // Today
    },
  },
  {
    volume: 400,
    streams: 35,
    trade: {
      invoice: 'INV012',
      action: 'INSTASETTLE',
      amount1: '$14.56',
      amount2: '$901.23',
      quantity: '85',
      duration: '15 mins',
      value: '$11,200',
      isOwner: false,
      timestamp: getTimestamp(2), // 2 days ago
    },
  },
  {
    volume: 560,
    streams: 28,
    trade: {
      invoice: 'INV013',
      action: 'INSTASETTLE',
      amount1: '$15.67',
      amount2: '$1012.34',
      quantity: '90',
      duration: '16 mins',
      value: '$12,200',
      isOwner: true,
      timestamp: getTimestamp(5), // 5 days ago
    },
  },
  {
    volume: 767,
    streams: 42,
    trade: {
      invoice: 'INV014',
      action: 'INSTASETTLE',
      amount1: '$16.78',
      amount2: '$1123.45',
      quantity: '95',
      duration: '17 mins',
      value: '$13,200',
      isOwner: false,
      timestamp: getTimestamp(15), // 15 days ago
    },
  },
  {
    volume: 850,
    streams: 38,
    trade: {
      invoice: 'INV015',
      action: 'INSTASETTLE',
      amount1: '$17.89',
      amount2: '$1234.56',
      quantity: '100',
      duration: '18 mins',
      value: '$14,200',
      isOwner: true,
      timestamp: getTimestamp(20), // 20 days ago
    },
  },
  {
    volume: 1500,
    streams: 75,
    trade: {
      invoice: 'INV016',
      action: 'INSTASETTLE',
      amount1: '$18.90',
      amount2: '$1345.67',
      quantity: '105',
      duration: '19 mins',
      value: '$15,200',
      isOwner: false,
      timestamp: getTimestamp(180), // 180 days ago
    },
  },
]

const chartConfig = {
  streams: {
    label: 'Streams',
    // color: 'hsl(var(--chart-1))',
    // color: 'red',
  },
} satisfies ChartConfig

export default function TradesChart() {
  const [activeBar, setActiveBar] = useState<number | null>(null)
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [isChartReady, setIsChartReady] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 25

  // Filter states
  const [selectedRange, setSelectedRange] = useState<string | null>(null)
  const [selectedTopN, setSelectedTopN] = useState<string>('all')
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState<string | null>(null)
  const [sliderValue, setSliderValue] = useState<number>(100)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Function to generate dummy data based on page number
  const generateDummyData = (
    pageNum: number,
    limit?: number
  ): ChartDataPoint[] => {
    const itemsToGenerate = limit || ITEMS_PER_PAGE
    return Array.from({ length: itemsToGenerate }).map((_, index) => {
      // For fixed amounts (10, 20, 30), generate higher volume trades
      const baseVolume = limit
        ? (limit - index) * 1000 + Math.floor(Math.random() * 500) // Descending order for top N
        : (pageNum - 1) * 2000 + index * 200 + Math.floor(Math.random() * 100)

      return {
        volume: baseVolume,
        streams: Math.floor(Math.random() * 50) + 10,
        trade: {
          invoice: `INV${String(pageNum).padStart(2, '0')}${String(
            index
          ).padStart(2, '0')}`,
          action: 'INSTASETTLE',
          amount1: `$${(Math.random() * 10 + 1).toFixed(2)}`,
          amount2: `$${(Math.random() * 100 + 20).toFixed(2)}`,
          quantity: String(Math.floor(Math.random() * 40) + 20),
          duration: `${Math.floor(Math.random() * 10) + 2} mins`,
          value: `$${baseVolume.toLocaleString()}`,
          isOwner: Math.random() > 0.5,
          timestamp:
            Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
        },
      }
    })
  }

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
    queryFn: async ({ pageParam = 1 }) => {
      console.log('Fetching page:', pageParam, 'selectedTopN:', selectedTopN)
      await new Promise((resolve) => setTimeout(resolve, 200))

      // If specific number selected, return exactly that many items
      if (selectedTopN !== 'all') {
        const limit = parseInt(selectedTopN)
        return generateDummyData(1, limit)
      }

      return generateDummyData(pageParam)
    },
    getNextPageParam: (lastPage, allPages) => {
      // Only enable infinite scroll for 'all'
      if (selectedTopN !== 'all') return undefined

      const nextPage = allPages.length < 10 ? allPages.length + 1 : undefined
      console.log(
        'Next page param:',
        nextPage,
        'Current pages:',
        allPages.length
      )
      return nextPage
    },
    initialPageParam: 1,
  })

  // Handle scroll with debounce
  const handleScroll = useCallback(
    (e: Event) => {
      // Only handle scroll for 'all' view
      if (selectedTopN !== 'all') return

      console.log('Scroll event fired')
      const container = e.target as HTMLDivElement
      if (!container || isFetchingNextPage || !hasNextPage) {
        console.log('Scroll handler early return:', {
          hasContainer: !!container,
          isFetchingNextPage,
          hasNextPage,
        })
        return
      }

      const { scrollLeft, scrollWidth, clientWidth } = container
      const scrollEnd = scrollWidth - clientWidth
      const threshold = scrollEnd * 0.7 // Load more when 70% scrolled

      console.log('Scroll Debug:', {
        scrollLeft,
        scrollWidth,
        clientWidth,
        scrollEnd,
        threshold,
        hasNextPage,
        isFetchingNextPage,
        currentDataLength: data?.pages.length,
      })

      if (scrollLeft >= threshold) {
        console.log('Fetching next page...')
        fetchNextPage()
      }
    },
    [
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      data?.pages.length,
      selectedTopN,
    ]
  )

  // Add scroll event listener
  useEffect(() => {
    console.log('Setting up scroll listener')
    const container = containerRef.current
    if (!container) {
      console.log('No container found')
      return
    }

    // Immediate check for initial load
    handleScroll({ target: container } as unknown as Event)

    const debouncedScroll = debounce((e: Event) => {
      console.log('Debounced scroll triggered')
      handleScroll(e)
    }, 50)

    container.addEventListener('scroll', debouncedScroll, { passive: true })

    return () => {
      console.log('Cleaning up scroll listener')
      container.removeEventListener('scroll', debouncedScroll)
      debouncedScroll.cancel()
    }
  }, [handleScroll])

  // Combine all pages of data
  const allChartData = useMemo(() => {
    if (!data?.pages) return []
    const flatData = data.pages.flat()
    console.log('All chart data length:', flatData.length)
    return flatData
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
        activeBar === index || selectedBar === index ? '#41fcb4' : '#114532',
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
              <SelectContent className="bg-background border border-primary">
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
              className="overflow-x-auto chart-scroll"
              style={{
                width: '100%',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
              }}
              onScroll={(e) => {
                console.log('Direct scroll event')
                handleScroll(e as unknown as Event)
              }}
            >
              <div
                style={{
                  width: `${containerWidth}px`,
                  height: '500px',
                  position: 'relative',
                }}
              >
                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full [mask-image:linear-gradient(to_top,black_0%,transparent_100%)]"
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
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      strokeWidth={1}
                      vertical={true}
                      horizontal={true}
                    />
                    <XAxis
                      dataKey="volume"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => `$${value}`}
                      label={{
                        value: 'Volume',
                        position: 'insideBottom',
                        offset: -10,
                      }}
                    />
                    <Bar dataKey="streams" radius={8}>
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
            {isFetchingNextPage && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 p-2 rounded-lg">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
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
