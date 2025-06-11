'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart'

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
    color: 'red',
  },
} satisfies ChartConfig

export default function TradesChartv2() {
  return (
    <div className="dark">
      <div className="w-full sm:p-6 bg-background text-foreground">
        {/* <div className="mb-4">
          <h2 className="text-2xl font-bold">Volume vs Streams</h2>
          <p className="text-muted-foreground">
            Relationship between volume and stream count
          </p>
        </div> */}

        <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="volume"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: 'Volume', position: 'insideBottom', offset: -10 }}
            />
            {/* <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              label={{ value: 'Streams', angle: -90, position: 'insideLeft' }}
            /> */}
            <ChartTooltip
              cursor={{ fill: 'rgba(255, 255, 255, 1)' }}
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
              //   fill="var(--color-streams)"
              radius={[4, 4, 0, 0]}
              fill="#114532"
            />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
}
