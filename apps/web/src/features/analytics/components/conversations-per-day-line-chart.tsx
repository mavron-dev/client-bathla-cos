'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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
import { EmptyState } from '@/features/dashboard/components/empty-state'

const config = {
  count: { label: 'Conversations', color: 'var(--primary)' },
} satisfies ChartConfig

export function ConversationsPerDayLineChart({
  data,
}: {
  data: { date: string; count: number }[]
}) {
  const formatXTick = React.useCallback(
    (iso: string) =>
      formatInAppTz(`${iso}T00:00:00Z`, { day: 'numeric', month: 'short' }),
    [],
  )
  const formatTooltipLabel = React.useCallback((iso: unknown) => {
    if (typeof iso !== 'string') return ''
    return formatInAppTz(`${iso}T00:00:00Z`, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversations per day</CardTitle>
        <CardDescription>Daily count over the selected range.</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data.length === 0 ? (
          <EmptyState
            title="No conversations"
            description="Nothing recorded in this window."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[220px] w-full"
          >
            <AreaChart data={data} margin={{ left: 0, right: 12, top: 12 }}>
              <defs>
                <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.55}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-count)"
                    stopOpacity={0.05}
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
                width={36}
                allowDecimals={false}
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
                dataKey="count"
                type="monotone"
                stroke="var(--color-count)"
                strokeWidth={2}
                fill="url(#fillCount)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
