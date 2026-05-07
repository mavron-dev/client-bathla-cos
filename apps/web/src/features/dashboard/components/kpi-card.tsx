'use client'

import * as React from 'react'
import CountUp from 'react-countup'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconMessages,
  IconCoins,
  IconUsers,
  IconCircleCheck,
} from '@tabler/icons-react'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatKPIValue, formatTrend, type KPIFormat } from '../lib/format'

/**
 * Icon registry for KPICard. We resolve names → components INSIDE this
 * client component instead of accepting a `ComponentType` prop, because
 * forwardRef components (every Tabler icon) can't be serialised from a
 * Server Component into a Client Component — RSC rejects the function on
 * the `render` field of the forwardRef object.
 */
const ICON_MAP = {
  messages: IconMessages,
  coins: IconCoins,
  users: IconUsers,
  'circle-check': IconCircleCheck,
} as const

export type KPIIconName = keyof typeof ICON_MAP

export interface KPICardProps {
  label: string
  value: number
  format: KPIFormat
  /** % delta vs previous period (e.g. 12.5 = +12.5%, -3.2 = -3.2%). */
  trend?: number
  /**
   * For metrics where "up" is good (conversations, success rate) leave as
   * default. For cost, where "up" is bad, pass `'down'` so the green/red
   * direction inverts in the badge.
   */
  trendIsGood?: 'up' | 'down'
  /** 7 daily values; rendered as a tiny inline sparkline. */
  sparkline?: number[]
  /** Optional sub-text shown under the trend badge. */
  footnote?: string
  /** Icon name from the ICON_MAP above. */
  icon?: KPIIconName
}

export function KPICard({
  label,
  value,
  format,
  trend,
  trendIsGood = 'up',
  sparkline,
  footnote,
  icon,
}: KPICardProps) {
  const Icon = icon ? ICON_MAP[icon] : null
  const display = formatKPIValue(value, format)
  // CountUp only works on plain numbers; for percent we animate the raw
  // number and pin a `%` suffix manually so the digit roll feels right.
  const useCountUp = format === 'number' || format === 'percent'

  const trendDirection: 'up' | 'down' | 'flat' =
    typeof trend !== 'number'
      ? 'flat'
      : trend > 0
        ? 'up'
        : trend < 0
          ? 'down'
          : 'flat'
  const trendIsPositive =
    trendDirection === 'flat'
      ? null
      : (trendDirection === 'up' && trendIsGood === 'up') ||
          (trendDirection === 'down' && trendIsGood === 'down')
        ? true
        : false

  return (
    <Card className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          {Icon && <Icon className="size-4 opacity-60" />}
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {useCountUp ? (
            <CountUp
              key={`${value}`}
              end={value}
              duration={1.0}
              decimals={format === 'percent' ? 1 : 0}
              separator=","
              suffix={format === 'percent' ? '%' : ''}
            />
          ) : (
            display
          )}
        </CardTitle>
        {trend !== undefined && (
          <CardAction>
            <Badge
              variant="outline"
              className={cn(
                'gap-1 font-medium tabular-nums',
                trendIsPositive === true &&
                  'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                trendIsPositive === false &&
                  'border-rose-500/30 text-rose-600 dark:text-rose-400',
              )}
            >
              {trendDirection === 'up' && <IconTrendingUp className="size-3.5" />}
              {trendDirection === 'down' && (
                <IconTrendingDown className="size-3.5" />
              )}
              {trendDirection === 'flat' && <IconMinus className="size-3.5" />}
              {formatTrend(trend)}
            </Badge>
          </CardAction>
        )}
      </CardHeader>

      {sparkline && sparkline.length > 0 && (
        <div className="-mt-2 h-12 w-full px-2">
          <Sparkline data={sparkline} positive={trendIsPositive} />
        </div>
      )}

      {footnote && (
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="text-muted-foreground line-clamp-1">{footnote}</div>
        </CardFooter>
      )}
    </Card>
  )
}

function Sparkline({
  data,
  positive,
}: {
  data: number[]
  positive: boolean | null
}) {
  // Convert to {i, v} so recharts has an x dimension. Sparklines never show
  // axes — they're a vibe, not a chart.
  const series = data.map((v, i) => ({ i, v }))
  const stroke =
    positive === true
      ? 'rgb(16 185 129)' // emerald-500
      : positive === false
        ? 'rgb(244 63 94)' // rose-500
        : 'currentColor'
  const gradientId = React.useId().replace(/:/g, '')
  const fillId = `spark-${gradientId}`
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#${fillId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
