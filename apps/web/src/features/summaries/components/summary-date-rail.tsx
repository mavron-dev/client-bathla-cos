'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { SummaryDateRailItem } from '@/lib/dashboard/summaries'

const TONE_DOT: Record<string, string> = {
  focused: 'bg-emerald-500',
  energetic: 'bg-amber-500',
  calm: 'bg-sky-500',
  frustrated: 'bg-rose-500',
  distracted: 'bg-violet-500',
  overwhelmed: 'bg-rose-600',
  neutral: 'bg-muted-foreground',
}

export function SummaryDateRail({
  items,
  selectedDate,
}: {
  items: SummaryDateRailItem[]
  selectedDate: string
}) {
  const pathname = usePathname()
  const sp = useSearchParams()

  const buildHref = (date: string) => {
    const next = new URLSearchParams(sp.toString())
    next.set('date', date)
    return `${pathname}?${next.toString()}`
  }

  const withSummaryCount = items.filter((i) => i.hasSummary).length

  return (
    <aside className="space-y-2 lg:sticky lg:top-4 lg:self-start">
      <div className="text-muted-foreground px-1 text-[10px] uppercase tracking-wide">
        Last {items.length} days · {withSummaryCount} with a summary
      </div>
      <ol className="space-y-1">
        {items.map((it) => {
          const active = it.date === selectedDate
          const tone = it.emotionalTone?.toLowerCase() ?? ''
          const dot = TONE_DOT[tone] ?? 'bg-muted-foreground/40'
          const label = formatDayLabel(it.date)

          if (!it.hasSummary) {
            return (
              <li key={it.date}>
                <span
                  className={cn(
                    'flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs',
                    'text-muted-foreground/60 cursor-not-allowed',
                  )}
                >
                  <span>{label}</span>
                  {it.isToday && (
                    <span className="text-[10px] uppercase tracking-wide">
                      Today
                    </span>
                  )}
                </span>
              </li>
            )
          }

          return (
            <li key={it.date}>
              <Link
                href={buildHref(it.date)}
                prefetch={false}
                className={cn(
                  'flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs',
                  active
                    ? 'bg-primary/10 text-foreground border-primary/30 border'
                    : 'hover:bg-muted/40',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn('size-1.5 rounded-full', dot)}
                    aria-hidden
                  />
                  <span>{label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {it.isToday && (
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      Today
                    </span>
                  )}
                  <span className="text-muted-foreground tabular-nums text-[10px]">
                    {it.decisionCount > 0 ? `${it.decisionCount} ✓` : ''}
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}

function formatDayLabel(isoDate: string): string {
  // isoDate is YYYY-MM-DD; render as "Mon 6 May" without TZ shifts.
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
