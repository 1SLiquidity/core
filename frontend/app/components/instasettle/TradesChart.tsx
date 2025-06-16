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
      savings: '40',
      duration: '4 mins',
      bps: '45',
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
      savings: '30',
      duration: '6 mins',
      bps: '70',
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
      savings: '35',
      duration: '5 mins',
      bps: '30',
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
      savings: '45',
      duration: '7 mins',
      bps: '40',
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
      savings: '50',
      duration: '8 mins',
      bps: '50',
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
      savings: '55',
      duration: '9 mins',
      bps: '60',
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
      savings: '60',
      duration: '10 mins',
      bps: '70',
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
      savings: '65',
      duration: '11 mins',
      bps: '80',
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
      savings: '70',
      duration: '12 mins',
      bps: '90',
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
      savings: '75',
      duration: '13 mins',
      bps: '100',
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
      savings: '80',
      duration: '14 mins',
      bps: '110',
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
      savings: '85',
      duration: '15 mins',
      bps: '120',
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
      savings: '90',
      duration: '16 mins',
      bps: '130',
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
      savings: '95',
      duration: '17 mins',
      bps: '140',
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
      savings: '100',
      duration: '18 mins',
      bps: '150',
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
      savings: '105',
      duration: '19 mins',
      bps: '160',
      isOwner: false,
      timestamp: getTimestamp(180), // 180 days ago
    },
  },
]

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
  const ITEMS_PER_PAGE = 20

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
    console.log('Generating dummy data:', { pageNum, limit, itemsToGenerate })
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
          savings: String(Math.floor(Math.random() * 40) + 20),
          duration: `${Math.floor(Math.random() * 10) + 2} mins`,
          bps: `$${baseVolume.toLocaleString()}`,
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
        return {
          trades: generateDummyData(1, limit),
          hasMore: false,
        }
      }

      const trades = generateDummyData(pageParam)
      return {
        trades,
        hasMore: trades.length === ITEMS_PER_PAGE, // Only has more if we got a full page
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      // Only enable infinite scroll for 'all' and if there's more data
      if (selectedTopN !== 'all' || !lastPage.hasMore) return undefined

      const nextPage = lastPage.hasMore ? allPages.length + 1 : undefined
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
    const flatData = data.pages.flatMap((page) => page.trades)
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

  // 114532
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
              className="overflow-x-auto chart-scroll rounded-2xl"
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
                ></div>

                {/* [mask-image:linear-gradient(to_top,black_0%,transparent_100%)] */}
                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full relative overflow-hidden"
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
                      stroke="hsl(var(--border))"
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
