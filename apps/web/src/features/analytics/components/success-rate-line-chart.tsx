'use client'

import * as React from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
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
  successRate: { label: 'Success rate', color: 'oklch(0.7 0.18 150)' },
} satisfies ChartConfig

export function SuccessRateLineChart({
  data,
}: {
  data: { date: string; successRate: number; total: number }[]
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
        <CardTitle>Success rate over time</CardTitle>
        <CardDescription>
          Daily share of conversations the agent self-rated &quot;success&quot;.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data.length === 0 ? (
          <EmptyState
            title="No quality data yet"
            description="Conversations + analysis will populate this chart."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[240px] w-full"
          >
            <LineChart data={data} margin={{ left: 0, right: 12, top: 12 }}>
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
                domain={[0, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: '3 3', strokeOpacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={formatTooltipLabel}
                    formatter={(value, _name, item) => {
                      const total =
                        ((item as { payload?: { total?: number } })?.payload
                          ?.total) ?? 0
                      return `${Math.round((value as number) * 100)}% · ${total} ${total === 1 ? 'conversation' : 'conversations'}`
                    }}
                  />
                }
              />
              <Line
                dataKey="successRate"
                type="monotone"
                stroke="var(--color-successRate)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
