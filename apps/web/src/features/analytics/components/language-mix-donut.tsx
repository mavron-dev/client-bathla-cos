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
  'oklch(0.62 0.18 250)',
  'oklch(0.7 0.16 60)',
  'oklch(0.7 0.16 200)',
  'oklch(0.65 0.18 320)',
]

const LANG_LABEL: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  'hi-en': 'Hinglish',
  hinglish: 'Hinglish',
  unknown: 'Unknown',
}

export function LanguageMixDonut({
  data,
}: {
  data: { language: string; count: number }[]
}) {
  const total = data.reduce((s, d) => s + d.count, 0)
  const labelled = data.map((d) => ({
    ...d,
    label: LANG_LABEL[d.language.toLowerCase()] ?? d.language,
  }))

  const config = React.useMemo<ChartConfig>(() => {
    const c: ChartConfig = {}
    labelled.forEach((d, i) => {
      c[d.language] = {
        label: d.label,
        color: PALETTE[i % PALETTE.length],
      }
    })
    return c
  }, [labelled])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Language mix</CardTitle>
        <CardDescription>
          Detected primary language across conversations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState
            title="No language data"
            description="Conversations will populate this once they include `mainLanguage`."
          />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ChartContainer
              config={config}
              className="mx-auto aspect-square h-[200px] flex-1"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => `${name}: ${value}`}
                    />
                  }
                />
                <Pie
                  data={labelled}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={45}
                  outerRadius={75}
                  strokeWidth={2}
                  paddingAngle={2}
                >
                  {labelled.map((d, i) => (
                    <Cell
                      key={d.language}
                      fill={PALETTE[i % PALETTE.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex-1 space-y-1.5">
              {labelled.map((d, i) => (
                <div
                  key={d.language}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="truncate">{d.label}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {d.count}{' '}
                    <span className="text-muted-foreground/70">
                      ({Math.round((d.count / total) * 100)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
