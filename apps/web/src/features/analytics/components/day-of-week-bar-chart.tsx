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

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const config = {
  count: { label: 'Conversations', color: 'var(--primary)' },
} satisfies ChartConfig

export function DayOfWeekBarChart({
  data,
}: {
  data: { dayOfWeek: number; count: number }[]
}) {
  // Pad to 7 days so the chart axis is always complete.
  const padded = DAYS.map((label, i) => ({
    label,
    count: data.find((d) => d.dayOfWeek === i)?.count ?? 0,
  }))
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Day of week pattern</CardTitle>
        <CardDescription>
          Which days of the week the team uses Bathla COS the most.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {total === 0 ? (
          <EmptyState
            title="No activity"
            description="No conversations recorded for this window."
          />
        ) : (
          <ChartContainer
            config={config}
            className="aspect-auto h-[200px] w-full"
          >
            <BarChart data={padded} margin={{ left: 0, right: 12, top: 12 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
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
