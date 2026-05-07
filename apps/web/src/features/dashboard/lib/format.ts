import { formatInAppTz } from '@/lib/timezone'

/**
 * Display formatters for KPI values + time deltas. Kept tiny and pure so they
 * can run on both server and client components.
 */

export type KPIFormat =
  | 'number'
  | 'currency_credits'
  | 'percent'
  | 'duration_secs'

export function formatKPIValue(value: number, format: KPIFormat): string {
  switch (format) {
    case 'currency_credits':
      return `${formatCompactNumber(value)} credits`
    case 'percent':
      // value is already a percentage (e.g. 87.5 → "87.5%")
      return `${value.toFixed(1).replace(/\.0$/, '')}%`
    case 'duration_secs':
      return formatDurationSecs(value)
    case 'number':
    default:
      return formatCompactNumber(value)
  }
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('en-IN')
}

export function formatDurationSecs(secs: number): string {
  if (secs < 60) return `${Math.round(secs)}s`
  const m = Math.floor(secs / 60)
  const s = Math.round(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Trend formatter. `+12.5%` / `-3.2%` / `±0%`. The sign is always shown.
 */
export function formatTrend(trend: number): string {
  if (Number.isNaN(trend)) return '±0%'
  if (trend === 0) return '±0%'
  const sign = trend > 0 ? '+' : ''
  return `${sign}${trend.toFixed(1).replace(/\.0$/, '')}%`
}

/**
 * "2h ago", "3 days ago" etc. without bringing in a heavy lib. Falls back to
 * an absolute date for anything > 7 days old. The fallback is rendered in
 * the app's IST (not the host machine / browser local) so it reads the same
 * regardless of where the dashboard is opened from.
 */
export function relativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const sec = Math.round(diffMs / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 7) return `${day}d ago`
  return formatInAppTz(d, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}
