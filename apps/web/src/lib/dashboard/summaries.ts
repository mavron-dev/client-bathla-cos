import { z } from 'zod'
import { prisma, withRetry } from '@/lib/prisma'

/**
 * ConversationSummary dashboard queries — date rail + per-day detail +
 * accessible-users list for the picker. All three are read-only; summaries
 * are produced by the daily summarization GraphQL flow and edited only via
 * direct DB intervention.
 */

// ────────────────────────────────────────────────────────────────────────────
// Defensive parsers for Json columns
//
// `keyDecisions` and `taskStateSnapshot` are `Json?` in Prisma and historical
// rows may not match the current shape. Use `safeParse` everywhere; tolerate
// extra/missing fields.

export const keyDecisionItemSchema = z
  .object({
    kind: z.string().nullish(),
    taskTitle: z.string().nullish(),
    description: z.string().nullish(),
    text: z.string().nullish(),
  })
  .passthrough()
export type KeyDecisionItem = z.infer<typeof keyDecisionItemSchema>

export const taskSnapshotSchema = z
  .object({
    pending: z.array(z.string()).default([]),
    in_progress: z.array(z.string()).default([]),
    deferred: z.array(z.string()).default([]),
  })
  .partial()
export type TaskSnapshot = z.infer<typeof taskSnapshotSchema>

// ────────────────────────────────────────────────────────────────────────────
// Date rail

export const summaryDatesQuerySchema = z.object({
  userId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(180).default(30),
  tz: z.string().min(1).max(64).default('Asia/Kolkata'),
})

export type SummaryDatesQuery = z.infer<typeof summaryDatesQuerySchema>

export type SummaryDateRailItem = {
  /** YYYY-MM-DD in the user's TZ. */
  date: string
  hasSummary: boolean
  decisionCount: number
  emotionalTone: string | null
  isToday: boolean
}

export async function listSummaryDates(
  raw: unknown,
): Promise<SummaryDateRailItem[]> {
  const q = summaryDatesQuerySchema.parse(raw)

  // Single round-trip:
  //   - generate the trailing N-day window in the user's TZ (so "today"
  //     corresponds to their day, not the server's),
  //   - LEFT JOIN ConversationSummary on (userId, summary_date),
  //   - guard `jsonb_array_length` against non-array values.
  const rows = await withRetry(() =>
    prisma.$queryRaw<
      {
        date: string
        has_summary: boolean
        decision_count: number
        emotional_tone: string | null
      }[]
    >`
      WITH days AS (
        SELECT (date_series)::date AS d
        FROM generate_series(
          (NOW() AT TIME ZONE ${q.tz})::date - (${q.days}::int - 1),
          (NOW() AT TIME ZONE ${q.tz})::date,
          INTERVAL '1 day'
        ) AS date_series
      )
      SELECT
        to_char(days.d, 'YYYY-MM-DD')                          AS date,
        cs.id IS NOT NULL                                       AS has_summary,
        CASE
          WHEN jsonb_typeof(cs.key_decisions) = 'array'
            THEN jsonb_array_length(cs.key_decisions)
          ELSE 0
        END::int                                                AS decision_count,
        cs.emotional_tone                                       AS emotional_tone
      FROM days
      LEFT JOIN "ConversationSummary" cs
        ON cs.user_id = ${q.userId}::uuid AND cs.summary_date = days.d
      ORDER BY days.d DESC
    `,
  )

  // Compute "today" once in the user's TZ for the highlight.
  const today = await todayInTz(q.tz)
  return rows.map((r) => ({
    date: r.date,
    hasSummary: r.has_summary,
    decisionCount: Number(r.decision_count ?? 0),
    emotionalTone: r.emotional_tone,
    isToday: r.date === today,
  }))
}

async function todayInTz(tz: string): Promise<string> {
  const rows = await withRetry(() =>
    prisma.$queryRaw<{ today: string }[]>`
      SELECT to_char((NOW() AT TIME ZONE ${tz})::date, 'YYYY-MM-DD') AS today
    `,
  )
  return rows[0]?.today ?? new Date().toISOString().slice(0, 10)
}

// ────────────────────────────────────────────────────────────────────────────
// Daily detail

export const summaryDetailQuerySchema = z.object({
  userId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD'),
})

export type SummaryDetailQuery = z.infer<typeof summaryDetailQuerySchema>

export type ConversationSummaryDetail = {
  id: string
  userId: string
  date: string
  summaryText: string
  keyDecisions: KeyDecisionItem[]
  taskStateSnapshot: TaskSnapshot
  emotionalTone: string | null
  communicationPattern: string | null
  messageCount: number | null
  tokenCount: number | null
  createdAt: Date
}

export async function getDailySummary(
  raw: unknown,
): Promise<ConversationSummaryDetail | null> {
  const q = summaryDetailQuerySchema.parse(raw)

  // The summary_date column is `@db.Date`. Constructing a Date in JS at UTC
  // midnight matches what Prisma persists for date-only columns.
  const summaryDate = new Date(`${q.date}T00:00:00Z`)
  const row = await withRetry(() =>
    prisma.conversationSummary.findUnique({
      where: { userId_summaryDate: { userId: q.userId, summaryDate } },
    }),
  )
  if (!row) return null

  const keyDecisions = parseKeyDecisions(row.keyDecisions)
  const taskStateSnapshot = parseTaskSnapshot(row.taskStateSnapshot)

  return {
    id: row.id,
    userId: row.userId,
    date: q.date,
    summaryText: row.summaryText,
    keyDecisions,
    taskStateSnapshot,
    emotionalTone: row.emotionalTone,
    communicationPattern: row.communicationPattern,
    messageCount: row.messageCount,
    tokenCount: row.tokenCount,
    createdAt: row.createdAt,
  }
}

function parseKeyDecisions(value: unknown): KeyDecisionItem[] {
  if (!Array.isArray(value)) return []
  const out: KeyDecisionItem[] = []
  for (const v of value) {
    const parsed = keyDecisionItemSchema.safeParse(v)
    if (parsed.success) out.push(parsed.data)
  }
  return out
}

function parseTaskSnapshot(value: unknown): TaskSnapshot {
  const parsed = taskSnapshotSchema.safeParse(value ?? {})
  if (!parsed.success) return {}
  return parsed.data
}

// ────────────────────────────────────────────────────────────────────────────
// "Most recent date with a summary" — used as the page's default landing day.

export async function findMostRecentSummaryDate(
  userId: string,
  tz: string,
): Promise<string | null> {
  const row = await withRetry(() =>
    prisma.conversationSummary.findFirst({
      where: { userId },
      orderBy: { summaryDate: 'desc' },
      select: { summaryDate: true },
    }),
  )
  if (!row) return null
  // Re-render the date as YYYY-MM-DD in the user's TZ so it matches what the
  // rail emits.
  const rows = await withRetry(() =>
    prisma.$queryRaw<{ d: string }[]>`
      SELECT to_char(${row.summaryDate}::date, 'YYYY-MM-DD') AS d
    `,
  )
  // Note: tz isn't actually applied above because summary_date is date-only;
  // we keep the param for symmetry / future use.
  void tz
  return rows[0]?.d ?? null
}

// ────────────────────────────────────────────────────────────────────────────
// Accessible users for the picker
//
// Admin/dev get the full active list. The page is admin/dev-gated already, so
// this just hands them every option.

export type SummaryUserOption = {
  id: string
  displayName: string
  image: string | null
  timezone: string
}

export async function listAccessibleSummaryUsers(): Promise<SummaryUserOption[]> {
  return withRetry(() =>
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, image: true, timezone: true },
    }),
  )
}

export async function getUserTimezone(userId: string): Promise<string> {
  const row = await withRetry(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),
  )
  return row?.timezone ?? 'Asia/Kolkata'
}
