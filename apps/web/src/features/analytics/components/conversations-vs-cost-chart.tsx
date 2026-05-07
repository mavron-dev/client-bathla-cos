'use client'

import * as React from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { EmptyState } from '@/features/dashboard/components/empty-state'

const config = {
  conversations: {
    label: 'Conversations',
    color: 'oklch(0.7 0.16 200)',
  },
  cost: {
    label: 'Cost (credits)',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

export function ConversationsVsCostChart({
  data,
}: {
  data: { date: string; conversations: number; cost: number }[]
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
        <CardTitle>Conversations vs cost</CardTitle>
        <CardDescription>
          Daily conversation count (bars) overlaid with cost in credits (line).
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data.length === 0 ? (
          <EmptyState
            title="No data in range"
            description="No conversations recorded for the selected window."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[280px] w-full"
          >
            <ComposedChart
              data={data}
              margin={{ left: 0, right: 12, top: 12 }}
            >
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
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={36}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={48}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
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
              <Bar
                yAxisId="left"
                dataKey="conversations"
                fill="var(--color-conversations)"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line
                yAxisId="right"
                dataKey="cost"
                type="monotone"
                stroke="var(--color-cost)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
