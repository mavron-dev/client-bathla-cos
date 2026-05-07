import { prisma, withRetry } from '@/lib/prisma'
import { APP_TIMEZONE, formatInAppTz } from '@/lib/timezone'
import { getHeatmap } from './analytics'

/**
 * Dashboard analytics queries. The home page wants four headline KPIs (with
 * trend vs the previous 7-day window and 7-value sparklines) plus a 30-day
 * cost-over-time chart. All of those derive from one daily-stats query, so
 * we run it once and aggregate in JS.
 *
 * Timezone: Phase 1 hardcodes Asia/Kolkata. The query takes it as a param
 * so multi-tenant (Phase 2) is a one-line change to feed the org tz.
 */

// Re-exported here for backwards compatibility with the in-file usage; the
// canonical constant lives in `@/lib/timezone`.
const DEFAULT_TZ = APP_TIMEZONE

export type DailyStat = {
  day: string // YYYY-MM-DD in tz
  conversations: number
  cost: number
  activeUsers: number
  successful: number
}

type RawDailyStat = {
  /**
   * 'YYYY-MM-DD' in the target timezone. Returned as TEXT (via to_char)
   * intentionally — see `getDailyStats` for why.
   */
  day: string
  conversations: bigint
  cost: bigint
  active_users: bigint
  successful: bigint
}

export type OverviewKPIs = {
  conversationsLast7d: { value: number; trend: number }
  costLast7d: { value: number; trend: number }
  activeUsersLast7d: { value: number; trend: number }
  successRateLast7d: { value: number; trend: number }
  sparklines: {
    conversations: number[]
    cost: number[]
    activeUsers: number[]
    successRate: number[]
  }
}

export type CostOverTimePoint = {
  date: string // YYYY-MM-DD
  cost: number
  conversations: number
}

export type RecentConversationItem = {
  id: string
  startedAt: Date
  endedAt: Date | null
  durationSecs: number | null
  channel: string
  costCredits: number | null
  callSuccessful: string | null
  analysisTitle: string | null
  analysisSummary: string | null
  messageCount: number
  mainLanguage: string | null
  user: {
    id: string
    displayName: string
    image: string | null
    phoneE164: string
  }
}

export type OverviewPayload = {
  generatedAt: string
  greeting: { today: string } // firstName is filled in by the caller from session
  kpis: OverviewKPIs
  costOverTime: CostOverTimePoint[]
  heatmap: { dayOfWeek: number; hour: number; count: number }[]
  recentConversations: RecentConversationItem[]
}

/**
 * Pull the last `days` daily stats. Used as the source of truth for KPIs +
 * trend + sparklines + the cost-over-time chart.
 *
 * Notes on shape:
 *   - `to_char` instead of `date_trunc`: returning a TEXT day key sidesteps
 *     the pg driver's `timestamp without time zone` parser, which uses the
 *     Node process's local TZ and silently flips dates around IST midnight.
 *   - 'Asia/Kolkata' is intentionally a literal here (not a parameter) to
 *     avoid Postgres prepared-statement type inference in the `AT TIME ZONE`
 *     position. Multi-tenant Phase 2 can switch to `Prisma.sql` with a
 *     properly cast parameter; for single-tenant POC we pin it.
 *
 * @param days  Window size in days (e.g. 30).
 */
async function getDailyStats(days: number): Promise<DailyStat[]> {
  const rows = await withRetry(() =>
    prisma.$queryRaw<RawDailyStat[]>`
      SELECT
        to_char("started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
        COUNT(*)                                              AS conversations,
        COALESCE(SUM("cost_credits"), 0)                      AS cost,
        COUNT(DISTINCT "user_id")                             AS active_users,
        COUNT(*) FILTER (WHERE "call_successful" = 'success') AS successful
      FROM "ConversationSession"
      WHERE "started_at" >= NOW() - (${days}::int || ' days')::interval
      GROUP BY day
      ORDER BY day ASC
    `,
  )
  return rows.map((r) => ({
    day: r.day,
    conversations: Number(r.conversations),
    cost: Number(r.cost),
    activeUsers: Number(r.active_users),
    successful: Number(r.successful),
  }))
}

/**
 * Pad a daily series to a complete N-day window. Postgres GROUP BY skips
 * days with zero rows; charts and sparklines need a value per day so the
 * x-axis stays uniform. Returns the merged series in chronological order.
 */
function padDailySeries(
  rows: DailyStat[],
  days: number,
  timezone: string,
): DailyStat[] {
  // Build the canonical day list. Anchored on "today" in the target tz so a
  // re-run at any hour returns the same N rows.
  const tzNowParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const todayKey = `${pickPart(tzNowParts, 'year')}-${pickPart(tzNowParts, 'month')}-${pickPart(tzNowParts, 'day')}`

  const byDay = new Map(rows.map((r) => [r.day, r]))
  const out: DailyStat[] = []

  // Walk back from today.
  const todayDate = new Date(`${todayKey}T00:00:00Z`)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayDate)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push(
      byDay.get(key) ?? {
        day: key,
        conversations: 0,
        cost: 0,
        activeUsers: 0,
        successful: 0,
      },
    )
  }
  return out
}

function pickPart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((p) => p.type === type)?.value ?? ''
}

function pctTrend(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 1000) / 10
}

/**
 * Build the home-page payload in one round trip:
 *   - 30 days of daily stats → cost-over-time chart
 *   - last 14 days → KPIs (current 7d totals + previous 7d for trend)
 *   - last 7 days → sparklines
 *   - 10 most-recent sessions → recent conversations table
 */
export async function getOverview(
  timezone = DEFAULT_TZ,
): Promise<OverviewPayload> {
  const [rawStats, activeUserCounts, recentSessions, heatmap] =
    await Promise.all([
      getDailyStats(30),
    // Window-unique active users — DISTINCT over the period, not summed daily.
    withRetry(() =>
      prisma.$queryRaw<{ curr: bigint; prev: bigint }[]>`
        SELECT
          COUNT(DISTINCT CASE
            WHEN "started_at" >= NOW() - INTERVAL '7 days'
            THEN "user_id"
          END) AS curr,
          COUNT(DISTINCT CASE
            WHEN "started_at" >= NOW() - INTERVAL '14 days'
             AND "started_at" <  NOW() - INTERVAL '7 days'
            THEN "user_id"
          END) AS prev
        FROM "ConversationSession"
        WHERE "started_at" >= NOW() - INTERVAL '14 days'
      `,
    ),
    withRetry(() =>
      prisma.conversationSession.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          channel: true,
          costCredits: true,
          callSuccessful: true,
          analysisTitle: true,
          analysisSummary: true,
          messageCount: true,
          mainLanguage: true,
          user: {
            select: {
              id: true,
              displayName: true,
              image: true,
              phoneE164: true,
            },
          },
        },
      }),
    ),
    getHeatmap(30),
  ])

  const stats30 = padDailySeries(rawStats, 30, timezone)
  const last7 = stats30.slice(-7)
  const prev7 = stats30.slice(-14, -7)

  const sumField = (rows: DailyStat[], k: keyof DailyStat) =>
    rows.reduce((s, r) => s + (r[k] as number), 0)

  const currConvs = sumField(last7, 'conversations')
  const prevConvs = sumField(prev7, 'conversations')
  const currCost = sumField(last7, 'cost')
  const prevCost = sumField(prev7, 'cost')
  const currActive = Number(activeUserCounts[0]?.curr ?? 0)
  const prevActive = Number(activeUserCounts[0]?.prev ?? 0)
  const currSuccessful = sumField(last7, 'successful')
  const prevSuccessful = sumField(prev7, 'successful')

  const currSuccessRate = currConvs > 0 ? currSuccessful / currConvs : 0
  const prevSuccessRate = prevConvs > 0 ? prevSuccessful / prevConvs : 0

  const sparklines = {
    conversations: last7.map((r) => r.conversations),
    cost: last7.map((r) => r.cost),
    activeUsers: last7.map((r) => r.activeUsers),
    successRate: last7.map((r) =>
      r.conversations > 0 ? r.successful / r.conversations : 0,
    ),
  }

  const costOverTime: CostOverTimePoint[] = stats30.map((r) => ({
    date: r.day,
    cost: r.cost,
    conversations: r.conversations,
  }))

  const recentConversations: RecentConversationItem[] = recentSessions.map(
    (s) => ({
      id: s.id,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationSecs:
        s.startedAt && s.endedAt
          ? Math.round(
              (s.endedAt.getTime() - s.startedAt.getTime()) / 1000,
            )
          : null,
      channel: s.channel,
      costCredits: s.costCredits,
      callSuccessful: s.callSuccessful,
      analysisTitle: s.analysisTitle,
      analysisSummary: s.analysisSummary,
      messageCount: s.messageCount,
      mainLanguage: s.mainLanguage,
      user: s.user,
    }),
  )

  return {
    generatedAt: new Date().toISOString(),
    greeting: {
      today: formatInAppTz(new Date(), {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    },
    kpis: {
      conversationsLast7d: {
        value: currConvs,
        trend: pctTrend(currConvs, prevConvs),
      },
      costLast7d: { value: currCost, trend: pctTrend(currCost, prevCost) },
      activeUsersLast7d: {
        value: currActive,
        trend: pctTrend(currActive, prevActive),
      },
      successRateLast7d: {
        value: Math.round(currSuccessRate * 1000) / 10, // percentage with 1 decimal
        trend:
          Math.round(
            (currSuccessRate - prevSuccessRate) * 100 * 10,
          ) / 10, // pp difference rounded to 0.1
      },
      sparklines,
    },
    costOverTime,
    heatmap,
    recentConversations,
  }
}

