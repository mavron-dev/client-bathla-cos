/**
 * Single source of truth for the app's display timezone.
 *
 * The database stores everything as UTC (Postgres `timestamptz` always
 * normalises to UTC internally), and analytics SQL uses
 * `AT TIME ZONE 'Asia/Kolkata'` for date buckets. The display layer needs
 * the same constant so dates render in IST on both server (Vercel runs UTC)
 * and client (browser TZ varies by user) — never let the formatter fall
 * back to its host TZ.
 *
 * Phase 2 multi-tenant: replace `APP_TIMEZONE` callers with a per-org
 * value pulled from `Organization.timezone`.
 */
export const APP_TIMEZONE = 'Asia/Kolkata'

/**
 * Format a Date in the app's timezone using Intl.DateTimeFormat options.
 * Pass any `Intl.DateTimeFormatOptions`; we always force `timeZone` and
 * `locale='en-IN'`. Returns the formatted string.
 *
 * Don't use this for raw deltas like "3 minutes ago" — those don't depend
 * on a timezone. Only use it where you'd otherwise call
 * `Date.toLocaleString` with an absolute calendar date / wall-clock time.
 */
export function formatInAppTz(
  d: Date | string | number,
  opts: Intl.DateTimeFormatOptions,
): string {
  const date = d instanceof Date ? d : new Date(d)
  return date.toLocaleString('en-IN', { ...opts, timeZone: APP_TIMEZONE })
}
