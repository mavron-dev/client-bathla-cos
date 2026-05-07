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
import { EmptyState } from '@/features/dashboard/components/empty-state'

const config = {
  hitRate: {
    label: 'Cache hit rate',
    color: 'var(--primary)',
  },
} satisfies ChartConfig

export function CacheHitRateChart({
  data,
}: {
  data: { date: string; hitRate: number }[]
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

  const avg =
    data.length > 0
      ? data.reduce((s, d) => s + d.hitRate, 0) / data.length
      : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cache hit rate</CardTitle>
        <CardDescription>
          Share of LLM input tokens served from cache. Higher = better LLM cost
          efficiency.
          {data.length > 0 && (
            <>
              {' '}
              Average over range:{' '}
              <span className="text-foreground font-medium tabular-nums">
                {Math.round(avg * 100)}%
              </span>
              .
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data.length === 0 ? (
          <EmptyState
            title="No cache data yet"
            description="No conversations in this range — cache hit rate will appear here once the agent runs."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[260px] w-full"
          >
            <AreaChart data={data} margin={{ left: 0, right: 12, top: 12 }}>
              <defs>
                <linearGradient id="fillHit" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-hitRate)"
                    stopOpacity={0.55}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-hitRate)"
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
                domain={[0, 1]}
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: '3 3', strokeOpacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={formatTooltipLabel}
                    formatter={(value) =>
                      `${Math.round((value as number) * 100)}%`
                    }
                  />
                }
              />
              <Area
                dataKey="hitRate"
                type="monotone"
                stroke="var(--color-hitRate)"
                strokeWidth={2}
                fill="url(#fillHit)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
