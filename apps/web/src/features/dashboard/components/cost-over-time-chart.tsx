'use client'

import * as React from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatInAppTz } from '@/lib/timezone'
import type { CostOverTimePoint } from '@/lib/dashboard/queries'

const chartConfig = {
  cost: {
    label: 'Cost (credits)',
    color: 'var(--primary)',
  },
  conversations: {
    label: 'Conversations',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

export function CostOverTimeChart({
  data,
}: {
  data: CostOverTimePoint[]
}) {
  // Format axis labels in IST so the dashboard reads identically regardless
  // of who opens it from where. The data points are already day-bucketed in
  // IST upstream (queries use AT TIME ZONE 'Asia/Kolkata'); this just keeps
  // the rendering layer consistent.
  const formatXTick = React.useCallback((iso: string) => {
    return formatInAppTz(`${iso}T00:00:00Z`, {
      day: 'numeric',
      month: 'short',
    })
  }, [])

  const formatTooltipLabel = React.useCallback((iso: unknown) => {
    if (typeof iso !== 'string') return ''
    return formatInAppTz(`${iso}T00:00:00Z`, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }, [])

  const totalCost = data.reduce((s, d) => s + d.cost, 0)
  const totalConvs = data.reduce((s, d) => s + d.conversations, 0)

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Cost over time</CardTitle>
        <CardDescription>
          Last 30 days · {totalConvs.toLocaleString('en-IN')} conversations ·{' '}
          {totalCost.toLocaleString('en-IN')} credits total
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[280px] w-full"
        >
          <AreaChart data={data} margin={{ left: 0, right: 12, top: 12 }}>
            <defs>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatXTick}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(v: number) =>
                v >= 1000
                  ? `${(v / 1000).toFixed(1)}k`
                  : v.toString()
              }
            />
            <ChartTooltip
              cursor={{ strokeDasharray: '3 3', strokeOpacity: 0.4 }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  labelFormatter={formatTooltipLabel}
                />
              }
            />
            <Area
              dataKey="cost"
              type="monotone"
              stroke="var(--color-cost)"
              strokeWidth={2}
              fill="url(#fillCost)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
