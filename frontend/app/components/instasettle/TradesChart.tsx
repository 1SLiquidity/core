'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useState, useEffect } from 'react'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'
import TradesTable from './TradesTable'

const chartData = [
  { volume: 2, streams: 4 },
  { volume: 15, streams: 12 },
  { volume: 45, streams: 8 },
  { volume: 120, streams: 25 },
  { volume: 250, streams: 18 },
  { volume: 400, streams: 35 },
  { volume: 567, streams: 28 },
  { volume: 767, streams: 42 },
  { volume: 890, streams: 38 },
  { volume: 1200, streams: 55 },
  { volume: 250, streams: 18 },
  { volume: 400, streams: 35 },
  { volume: 567, streams: 28 },
  { volume: 767, streams: 42 },
  { volume: 890, streams: 38 },
  { volume: 1200, streams: 55 },
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

  useEffect(() => {
    // Ensure chart is mounted before enabling interactions
    setIsChartReady(true)
  }, [])

  const getBarProps = (index: number) => ({
    fill: activeBar === index || selectedBar === index ? '#41fcb4' : '#114532',
    cursor: 'pointer',
  })

  const handleBarClick = (data: any, index: number) => {
    if (!isChartReady) return
    setSelectedBar(selectedBar === index ? null : index)
    if (selectedBar !== index) {
      console.log('Selected Bar Details:', {
        volume: data.volume,
        streams: data.streams,
      })
    }
  }

  if (!isChartReady) {
    return null
  }

  return (
    <>
      <div className="dark">
        <div className="w-full bg-background text-foreground">
          {/* <div className="mb-4">
          <h2 className="text-2xl font-bold">Volume vs Streams</h2>
          <p className="text-muted-foreground">
            Relationship between volume and stream count
          </p>
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
      <TradesTable />
    </>
  )
}
