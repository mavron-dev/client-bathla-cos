'use client'

import * as React from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const DAY_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

export interface HeatmapCell {
  dayOfWeek: number // 0=Mon … 6=Sun
  hour: number // 0..23
  count: number
}

/**
 * 7×24 conversation activity heatmap. Hours are in IST (the SQL bucketed
 * with `AT TIME ZONE 'Asia/Kolkata'`). Color intensity scales linearly
 * against the max count in the dataset; an entirely empty grid renders all
 * dim cells with the same tone.
 */
export function ActivityHeatmap({ data }: { data: HeatmapCell[] }) {
  const grid = React.useMemo(() => buildGrid(data), [data])
  const max = React.useMemo(
    () => data.reduce((m, c) => Math.max(m, c.count), 0),
    [data],
  )

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour axis */}
          <div className="text-muted-foreground flex items-center gap-[2px] pl-10 text-[10px] tabular-nums">
            {Array.from({ length: 24 }).map((_, h) => (
              <div
                key={h}
                className="flex h-3 flex-1 items-center justify-center"
              >
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="mt-1 flex flex-col gap-[2px]">
            {DAY_LABELS.map((label, d) => (
              <div key={d} className="flex items-center gap-[2px]">
                <div className="text-muted-foreground w-10 text-right pr-2 text-[10px] uppercase tracking-wide">
                  {label}
                </div>
                {Array.from({ length: 24 }).map((_, h) => (
                  <Cell
                    key={h}
                    count={grid[d][h]}
                    max={max}
                    dayLong={DAY_LONG[d]}
                    hour={h}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="text-muted-foreground mt-3 flex items-center gap-2 pl-10 text-[10px]">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((i) => (
              <div
                key={i}
                className="size-3 rounded-[2px]"
                style={{ background: cellColor(i) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

function Cell({
  count,
  max,
  dayLong,
  hour,
}: {
  count: number
  max: number
  dayLong: string
  hour: number
}) {
  const intensity = max === 0 ? 0 : count === 0 ? 0 : count / max
  const isEmpty = count === 0
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'h-3 flex-1 min-w-[6px] rounded-[2px] transition-colors',
            isEmpty && 'border-border/40 border',
          )}
          style={{ background: isEmpty ? 'transparent' : cellColor(intensity) }}
          aria-label={`${dayLong} ${hour}:00 — ${count} conversations`}
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="text-xs tabular-nums"
      >
        {dayLong} {hour.toString().padStart(2, '0')}:00 —{' '}
        <span className="font-semibold">
          {count} {count === 1 ? 'conversation' : 'conversations'}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

/** Linear interpolation in HSL for crisp colour at low intensities. */
function cellColor(intensity: number): string {
  if (intensity <= 0) return 'hsl(var(--muted))'
  // Map 0..1 → opacity 0.18..0.95 of the primary token.
  const alpha = 0.18 + intensity * 0.77
  return `oklch(from var(--primary) l c h / ${alpha.toFixed(3)})`
}

function buildGrid(data: HeatmapCell[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  )
  for (const c of data) {
    if (c.dayOfWeek >= 0 && c.dayOfWeek < 7 && c.hour >= 0 && c.hour < 24) {
      grid[c.dayOfWeek][c.hour] = c.count
    }
  }
  return grid
}
