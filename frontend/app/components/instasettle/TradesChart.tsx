'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useState, useEffect, useMemo } from 'react'

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

  // Filter states
  const [selectedRange, setSelectedRange] = useState<string | null>(null)
  const [selectedTopN, setSelectedTopN] = useState<string>('all')
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState<string | null>(null)
  const [sliderValue, setSliderValue] = useState<number>(100)
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Sort chart data in ascending order based on volume
  const chartData = useMemo(() => {
    return [...unsortedChartData].sort((a, b) => a.volume - b.volume)
  }, [])

  useEffect(() => {
    // Ensure chart is mounted before enabling interactions
    setIsChartReady(true)
  }, [])

  const getBarProps = (index: number) => ({
    fill: activeBar === index || selectedBar === index ? '#41fcb4' : '#114532',
    cursor: 'pointer',
  })

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

  if (!isChartReady) {
    return null
  }

  // Get min and max volume for the heading
  const minVolume = Math.min(...chartData.map((data) => data.volume))
  const maxVolume = Math.max(...chartData.map((data) => data.volume))

  return (
    <div className="mt-32 mb-16">
      <div className="dark">
        <div className="w-full bg-background text-foreground">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              Top Trades (${minVolume} - ${maxVolume})
            </h2>
          </div>

          {/* 1. Range Tags Filter */}
          {/* <div className="mb-8">
            <h3 className="text-lg mb-2">1. Range Tags Filter</h3>
            <div className="flex gap-2">
              {['$0-$30', '$30-$60', '$60-$90', '$90+'].map((range) => (
                <button
                  key={range}
                  onClick={() =>
                    setSelectedRange(selectedRange === range ? null : range)
                  }
                  className={`px-4 py-2 rounded-lg border border-primary transition-colors ${
                    selectedRange === range
                      ? 'bg-primaryGradient text-black'
                      : 'hover:bg-tabsGradient'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div> */}

          {/* 2. Top N Dropdown */}
          {/* <div className="mb-8">
            <h3 className="text-lg mb-2">2. Top N Dropdown</h3>
            <div className="flex items-center gap-2">
              <span>Show:</span>
              <select
                value={selectedTopN}
                onChange={(e) => setSelectedTopN(e.target.value)}
                className="bg-transparent border border-primary rounded-lg px-3 py-2"
              >
                <option value="10">Top 10 Trades</option>
                <option value="20">Top 20 Trades</option>
                <option value="30">Top 30 Trades</option>
                <option value="all">All Trades</option>
              </select>
            </div>
          </div> */}

          {/* 3. Multi-Filter Combination */}
          {/* <div className="mb-8">
            <h3 className="text-lg mb-2">3. Multi-Filter Combination</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span>Volume:</span>
                <div className="flex border border-primary rounded-lg overflow-hidden">
                  {['Low', 'Mid', 'High'].map((vol) => (
                    <button
                      key={vol}
                      onClick={() =>
                        setSelectedVolume(selectedVolume === vol ? null : vol)
                      }
                      className={`px-3 py-1 transition-colors ${
                        selectedVolume === vol
                          ? 'bg-primaryGradient text-black'
                          : 'hover:bg-tabsGradient'
                      } ${
                        vol === 'Mid' ? 'border-l border-r border-primary' : ''
                      }`}
                    >
                      {vol}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span>Show:</span>
                <div className="flex border border-primary rounded-lg overflow-hidden">
                  {['10', '20', '30'].map((count) => (
                    <button
                      key={count}
                      onClick={() =>
                        setSelectedCount(selectedCount === count ? null : count)
                      }
                      className={`px-3 py-1 transition-colors ${
                        selectedCount === count
                          ? 'bg-primaryGradient text-black'
                          : 'hover:bg-tabsGradient'
                      } ${
                        count === '20' ? 'border-l border-r border-primary' : ''
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div> */}

          {/* 4. Interactive Slider with Presets */}
          {/* <div className="mb-8">
            <h3 className="text-lg mb-2">4. Interactive Slider with Presets</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Trade Volume Range</span>
                <div className="flex gap-2">
                  {['Top 10', 'Top 20', 'All'].map((preset) => (
                    <button
                      key={preset}
                      onClick={() =>
                        setSliderValue(
                          preset === 'All'
                            ? 100
                            : parseInt(preset.split(' ')[1])
                        )
                      }
                      className="text-sm px-2 py-1 rounded border border-primary hover:bg-tabsGradient"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-sm text-white52">
                <span>$0</span>
                <span>$50</span>
                <span>$100</span>
              </div>
            </div>
          </div> */}

          {/* 5. Tag Cloud Filter */}
          {/* <div className="mb-8">
            <h3 className="text-lg mb-2">5. Tag Cloud Filter</h3>
            <div className="flex flex-wrap gap-2">
              {[
                'Top 5 🔥',
                '$0-$25',
                '$25-$50',
                '$50-$75',
                'High Volume',
                'Recent Only',
              ].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSelectedTags(
                      selectedTags.includes(tag)
                        ? selectedTags.filter((t) => t !== tag)
                        : [...selectedTags, tag]
                    )
                  }}
                  className={`px-3 py-1 rounded-full border border-primary transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-primaryGradient text-black'
                      : 'hover:bg-tabsGradient'
                  } text-sm`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div> */}

          <ChartContainer
            config={chartConfig}
            className="min-h-[500px] w-full [mask-image:linear-gradient(to_top,black_0%,transparent_100%)]"
          >
            <BarChart
              accessibilityLayer
              data={chartData.map((item, index) => ({
                ...item,
                fill: getBarProps(index).fill,
              }))}
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
                    chartData[data.activeTooltipIndex],
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
                label={{
                  value: 'Volume',
                  position: 'insideBottom',
                  offset: -10,
                }}
              />

              {/* <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: 'Streams', angle: -90, position: 'insideLeft' }}
            /> */}
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
                            <span className="text-sm font-bold">${label}</span>
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
              <Bar
                dataKey="streams"
                // radius={[4, 4, 0, 0]}
                radius={8}
                fill="#114532"
              />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
      <TradesTable
        selectedTrade={
          selectedBar !== null ? chartData[selectedBar].trade : null
        }
        selectedVolume={
          selectedBar !== null ? chartData[selectedBar].volume : null
        }
        isChartFiltered={selectedBar !== null}
        onClearSelection={() => setSelectedBar(null)}
      />
    </div>
  )
}
