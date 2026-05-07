'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
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

const BUCKET_ORDER = ['<30s', '30-60s', '1-2m', '2-5m', '5m+'] as const

const config = {
  count: { label: 'Conversations', color: 'oklch(0.7 0.16 60)' },
} satisfies ChartConfig

export function DurationHistogram({
  data,
}: {
  data: { bucket: string; count: number }[]
}) {
  const padded = BUCKET_ORDER.map((bucket) => ({
    bucket,
    count: data.find((d) => d.bucket === bucket)?.count ?? 0,
  }))
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Duration distribution</CardTitle>
        <CardDescription>
          Length distribution of conversations in the range.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {total === 0 ? (
          <EmptyState
            title="No durations"
            description="No completed conversations recorded for this window."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[200px] w-full"
          >
            <BarChart data={padded} margin={{ left: 0, right: 12, top: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={32}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" hideLabel />}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
