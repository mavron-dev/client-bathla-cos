'use client'

import * as React from 'react'
import { Cell, Pie, PieChart } from 'recharts'
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
import { EmptyState } from '@/features/dashboard/components/empty-state'

const PALETTE = [
  'oklch(0.62 0.18 250)', // primary-ish
  'oklch(0.7 0.16 200)',
  'oklch(0.75 0.15 60)',
  'oklch(0.65 0.18 320)',
  'oklch(0.6 0.16 25)',
  'oklch(0.7 0.12 150)',
]

export interface CostByModelEntry {
  model: string
  cost: number // USD
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export function CostByModelDonut({
  data,
}: {
  data: CostByModelEntry[]
}) {
  const total = data.reduce((s, d) => s + d.cost, 0)
  const config = React.useMemo<ChartConfig>(() => {
    const c: ChartConfig = {}
    data.forEach((d, i) => {
      c[d.model] = {
        label: d.model,
        color: PALETTE[i % PALETTE.length],
      }
    })
    return c
  }, [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost by model</CardTitle>
        <CardDescription>
          USD spent per LLM model over the range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <EmptyState
            title="No model breakdown"
            description="No LLM charges recorded for this window."
          />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ChartContainer
              config={config}
              className="mx-auto aspect-square h-[220px] flex-1"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) =>
                        `${name}: ${formatUsd(value as number)}`
                      }
                    />
                  }
                />
                <Pie
                  data={data}
                  dataKey="cost"
                  nameKey="model"
                  innerRadius={50}
                  outerRadius={85}
                  strokeWidth={2}
                  paddingAngle={2}
                >
                  {data.map((d, i) => (
                    <Cell
                      key={d.model}
                      fill={PALETTE[i % PALETTE.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-1.5">
              {data.map((d, i) => (
                <div
                  key={d.model}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="truncate font-mono text-xs">
                      {d.model}
                    </span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {formatUsd(d.cost)}{' '}
                    <span className="text-muted-foreground/70">
                      ({total > 0 ? Math.round((d.cost / total) * 100) : 0}%)
                    </span>
                  </span>
                </div>
              ))}
              <div className="border-border/50 mt-2 flex items-center justify-between gap-2 border-t pt-2 text-sm font-medium">
                <span>Total</span>
                <span className="tabular-nums">{formatUsd(total)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatUsd(usd: number): string {
  if (usd === 0) return '$0'
  if (usd < 0.001) return '<$0.001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}
