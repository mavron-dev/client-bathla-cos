import { TZDate } from '@date-fns/tz'
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  differenceInCalendarDays,
} from 'date-fns'

/**
 * Timezone helpers used by the agent-callable endpoints.
 *
 * All functions take an IANA tz string (e.g. `Asia/Kolkata`) and operate via
 * `@date-fns/tz`'s `TZDate` so the calendar arithmetic happens in the user's
 * local time, not the server's UTC.
 */

/** ISO 8601 with explicit offset, e.g. `2026-04-23T14:30:00+05:30` */
export function currentLocalTimeISO(tz: string, now: Date = new Date()): string {
  const tzNow = new TZDate(now, tz)
  return format(tzNow, "yyyy-MM-dd'T'HH:mm:ssXXX")
}

/**
 * Format a date the way the agent will read it back to the user.
 *
 *   - same day                 → "Today 11:00 AM"
 *   - next day                 → "Tomorrow 11:00 AM"
 *   - within next 6 days       → "Friday 11:00 AM"
 *   - beyond 6 days, same year → "Apr 26, 11:00 AM"
 *   - beyond 6 days, next year → "Apr 26, 2027, 11:00 AM"
 *   - in the past              → "Overdue (was Mon 11:00 AM)"
 */
export function formatLocal(
  date: Date,
  tz: string,
  now: Date = new Date(),
): string {
  const tzNow = new TZDate(now, tz)
  const tzDate = new TZDate(date, tz)
  const days = differenceInCalendarDays(tzDate, tzNow)
  const timePart = format(tzDate, 'h:mm a')

  if (days < 0) {
    const dayLabel = format(tzDate, 'EEE')
    return `Overdue (was ${dayLabel} ${timePart})`
  }
  if (days === 0) return `Today ${timePart}`
  if (days === 1) return `Tomorrow ${timePart}`
  if (days <= 6) {
    return `${format(tzDate, 'EEEE')} ${timePart}`
  }
  const sameYear = format(tzDate, 'yyyy') === format(tzNow, 'yyyy')
  return sameYear
    ? `${format(tzDate, 'MMM d')}, ${timePart}`
    : `${format(tzDate, 'MMM d, yyyy')}, ${timePart}`
}

/** Returns the UTC instant that begins the given calendar day in `tz`. */
export function startOfDayInTz(date: Date, tz: string): Date {
  return new Date(startOfDay(new TZDate(date, tz)).getTime())
}

/** Returns the UTC instant that ends the given calendar day in `tz`. */
export function endOfDayInTz(date: Date, tz: string): Date {
  return new Date(endOfDay(new TZDate(date, tz)).getTime())
}

/** Add days in `tz`, return the resulting UTC instant. */
export function addDaysInTz(date: Date, days: number, tz: string): Date {
  return new Date(addDays(new TZDate(date, tz), days).getTime())
}

/** Parse a `YYYY-MM-DD` string as the start of that calendar day in `tz`. */
export function parseDateInTz(yyyymmdd: string, tz: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(yyyymmdd)) return null
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  if (!y || !m || !d) return null
  // Construct a TZDate at midnight local time, then return its UTC instant.
  const tzMidnight = new TZDate(y, m - 1, d, 0, 0, 0, 0, tz)
  const utc = new Date(tzMidnight.getTime())
  if (isNaN(utc.getTime())) return null
  return utc
}
