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
  llm: { label: 'LLM', color: 'var(--primary)' },
  call: { label: 'Call', color: 'var(--chart-2, oklch(0.7 0.18 200))' },
  tts: { label: 'TTS', color: 'var(--chart-3, oklch(0.75 0.16 60))' },
} satisfies ChartConfig

export function CostStackedAreaChart({
  data,
}: {
  data: { date: string; llm: number; call: number; tts: number }[]
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

  const total = data.reduce((s, d) => s + d.llm + d.call + d.tts, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost over time</CardTitle>
        <CardDescription>
          Daily credits stacked by component (LLM / call / TTS).
          {total > 0 && (
            <>
              {' '}
              Range total:{' '}
              <span className="text-foreground font-medium tabular-nums">
                {total.toLocaleString('en-IN')}
              </span>{' '}
              credits.
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {data.length === 0 ? (
          <EmptyState
            title="No cost data"
            description="No conversations in this range yet."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[280px] w-full"
          >
            <AreaChart data={data} margin={{ left: 0, right: 12, top: 12 }}>
              <defs>
                {(['llm', 'call', 'tts'] as const).map((k) => (
                  <linearGradient
                    key={k}
                    id={`fill-${k}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={`var(--color-${k})`}
                      stopOpacity={0.6}
                    />
                    <stop
                      offset="95%"
                      stopColor={`var(--color-${k})`}
                      stopOpacity={0.05}
                    />
                  </linearGradient>
                ))}
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
              <Area
                dataKey="llm"
                stackId="cost"
                type="monotone"
                stroke="var(--color-llm)"
                strokeWidth={1.5}
                fill="url(#fill-llm)"
              />
              <Area
                dataKey="call"
                stackId="cost"
                type="monotone"
                stroke="var(--color-call)"
                strokeWidth={1.5}
                fill="url(#fill-call)"
              />
              <Area
                dataKey="tts"
                stackId="cost"
                type="monotone"
                stroke="var(--color-tts)"
                strokeWidth={1.5}
                fill="url(#fill-tts)"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
