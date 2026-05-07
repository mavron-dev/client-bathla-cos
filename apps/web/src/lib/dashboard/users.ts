import { z } from 'zod'
import { prisma, withRetry } from '@/lib/prisma'

/**
 * Dashboard-side user queries: cards grid stats + detail-page activity.
 * Pure read-only — admin operations (invite/edit/deactivate) still go
 * through `server/users/service.ts` and `/api/users/*`.
 */

export const usersWithStatsQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  role: z
    .enum(['developer', 'admin', 'director', 'manager', 'member'])
    .optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('active'),
})
export type UsersWithStatsQuery = z.infer<typeof usersWithStatsQuerySchema>

export type UserCardStats = {
  id: string
  email: string
  displayName: string
  image: string | null
  phoneE164: string
  role: string
  isActive: boolean
  // 30-day stats
  conversations30d: number
  totalCost30d: number
  successRate30d: number
  lastActive: Date | null
  // 14-day daily activity sparkline (count per day, padded)
  sparkline14d: number[]
}

/**
 * One round trip per family of stats. We only ever have a handful of users
 * (single-org Phase 1) so the N=users overhead on the sparkline aggregation
 * is fine. The shape is one row per user including 30-day rollup + a
 * jsonb_object_agg of daily counts that we unpack in JS.
 */
export async function getUsersWithStats(
  raw: unknown = {},
): Promise<UserCardStats[]> {
  const q = usersWithStatsQuerySchema.parse(raw)

  // Build the WHERE for the user table.
  const search = q.search ?? null
  const role = q.role ?? null
  const isActiveFilter =
    q.status === 'active' ? true : q.status === 'inactive' ? false : null

  const rows = await withRetry(() =>
    prisma.$queryRaw<
      {
        id: string
        email: string
        display_name: string
        image: string | null
        phone_e164: string
        role: string
        is_active: boolean
        conversations_30d: bigint
        total_cost_30d: bigint
        successful_30d: bigint
        last_active: Date | null
      }[]
    >`
      SELECT
        u."id"            AS id,
        u."email"         AS email,
        u."display_name"  AS display_name,
        u."image"         AS image,
        u."phone_e164"    AS phone_e164,
        u."role"::text    AS role,
        u."is_active"     AS is_active,
        COUNT(cs."id") FILTER (
          WHERE cs."started_at" >= NOW() - INTERVAL '30 days'
        )                                                         AS conversations_30d,
        COALESCE(SUM(cs."cost_credits") FILTER (
          WHERE cs."started_at" >= NOW() - INTERVAL '30 days'
        ), 0)                                                     AS total_cost_30d,
        COUNT(cs."id") FILTER (
          WHERE cs."started_at" >= NOW() - INTERVAL '30 days'
            AND cs."call_successful" = 'success'
        )                                                         AS successful_30d,
        MAX(cs."started_at")                                      AS last_active
      FROM "User" u
      LEFT JOIN "ConversationSession" cs ON cs."user_id" = u."id"
      WHERE
        (${isActiveFilter}::boolean IS NULL OR u."is_active" = ${isActiveFilter}::boolean)
        AND (${role}::text IS NULL OR u."role"::text = ${role}::text)
        AND (
          ${search}::text IS NULL
          OR u."display_name" ILIKE '%' || ${search}::text || '%'
          OR u."email" ILIKE '%' || ${search}::text || '%'
          OR u."phone_e164" ILIKE '%' || ${search}::text || '%'
        )
      GROUP BY u."id", u."email", u."display_name", u."image", u."phone_e164", u."role", u."is_active"
      ORDER BY conversations_30d DESC, u."display_name" ASC
    `,
  )

  // Sparkline: one query for daily counts, grouped by user, last 14 days.
  // Cheaper than N round-trips and easy to bucket in JS.
  const sparkRows = await withRetry(() =>
    prisma.$queryRaw<
      { user_id: string; day: string; count: bigint }[]
    >`
      SELECT
        cs."user_id"                                                       AS user_id,
        to_char(cs."started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
        COUNT(*)                                                            AS count
      FROM "ConversationSession" cs
      WHERE cs."started_at" >= NOW() - INTERVAL '14 days'
      GROUP BY cs."user_id", day
    `,
  )

  // Build today's IST date label so we can pad each user's sparkline
  // backward 14 days. We rely on the fact that day strings sort
  // lexicographically when in YYYY-MM-DD form.
  const days14 = lastNDayKeys(14)
  const sparkByUser = new Map<string, Map<string, number>>()
  for (const r of sparkRows) {
    const m = sparkByUser.get(r.user_id) ?? new Map<string, number>()
    m.set(r.day, Number(r.count))
    sparkByUser.set(r.user_id, m)
  }

  return rows.map((r) => {
    const userSpark = sparkByUser.get(r.id)
    const sparkline = days14.map((d) => userSpark?.get(d) ?? 0)
    const conversations = Number(r.conversations_30d)
    const successful = Number(r.successful_30d)
    return {
      id: r.id,
      email: r.email,
      displayName: r.display_name,
      image: r.image,
      phoneE164: r.phone_e164,
      role: r.role,
      isActive: r.is_active,
      conversations30d: conversations,
      totalCost30d: Number(r.total_cost_30d),
      successRate30d: conversations > 0 ? successful / conversations : 0,
      lastActive: r.last_active,
      sparkline14d: sparkline,
    }
  })
}

function lastNDayKeys(n: number, now: Date = new Date()): string[] {
  const tzNow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const today = `${pickPart(tzNow, 'year')}-${pickPart(tzNow, 'month')}-${pickPart(tzNow, 'day')}`
  const todayDate = new Date(`${today}T00:00:00Z`)
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(todayDate)
    d.setUTCDate(d.getUTCDate() - i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

function pickPart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((p) => p.type === type)?.value ?? ''
}

// ────────────────────────────────────────────────────────────────────────────
// User detail Activity tab

export type UserActivityKPIs = {
  conversations: number
  messages: number
  totalCost: number
  successRate: number
}

export type UserActivityPayload = {
  kpis: UserActivityKPIs
  conversationsPerDay: { date: string; count: number }[]
  costPerDay: { date: string; cost: number }[]
  recentConversations: {
    id: string
    startedAt: Date
    endedAt: Date | null
    durationSecs: number | null
    channel: string
    analysisTitle: string | null
    analysisSummary: string | null
    costCredits: number | null
    callSuccessful: string | null
    messageCount: number
  }[]
}

export async function getUserActivity(
  userId: string,
  daysBack = 30,
): Promise<UserActivityPayload> {
  const [kpiRow, dailyRows, recent] = await Promise.all([
    withRetry(() =>
      prisma.$queryRaw<
        {
          conversations: bigint
          messages: bigint
          total_cost: bigint
          successful: bigint
        }[]
      >`
        SELECT
          COUNT(*)                                              AS conversations,
          COALESCE(SUM("message_count"), 0)                     AS messages,
          COALESCE(SUM("cost_credits"), 0)                      AS total_cost,
          COUNT(*) FILTER (WHERE "call_successful" = 'success') AS successful
        FROM "ConversationSession"
        WHERE "user_id" = ${userId}::uuid
          AND "started_at" >= NOW() - (${daysBack}::int || ' days')::interval
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<
        { day: string; conversations: bigint; cost: bigint }[]
      >`
        SELECT
          to_char("started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COUNT(*)                                                         AS conversations,
          COALESCE(SUM("cost_credits"), 0)                                 AS cost
        FROM "ConversationSession"
        WHERE "user_id" = ${userId}::uuid
          AND "started_at" >= NOW() - (${daysBack}::int || ' days')::interval
        GROUP BY day
        ORDER BY day ASC
      `,
    ),
    withRetry(() =>
      prisma.conversationSession.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          channel: true,
          analysisTitle: true,
          analysisSummary: true,
          costCredits: true,
          callSuccessful: true,
          messageCount: true,
        },
      }),
    ),
  ])

  const k = kpiRow[0]
  const conversations = Number(k?.conversations ?? 0)
  const successful = Number(k?.successful ?? 0)

  return {
    kpis: {
      conversations,
      messages: Number(k?.messages ?? 0),
      totalCost: Number(k?.total_cost ?? 0),
      successRate: conversations > 0 ? successful / conversations : 0,
    },
    conversationsPerDay: dailyRows.map((r) => ({
      date: r.day,
      count: Number(r.conversations),
    })),
    costPerDay: dailyRows.map((r) => ({
      date: r.day,
      cost: Number(r.cost),
    })),
    recentConversations: recent.map((r) => ({
      ...r,
      durationSecs:
        r.startedAt && r.endedAt
          ? Math.max(
              0,
              Math.round(
                (r.endedAt.getTime() - r.startedAt.getTime()) / 1000,
              ),
            )
          : null,
    })),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Reminder schedule helpers

export type ReminderSlotName =
  | 'morning_brief'
  | 'midday_check'
  | 'afternoon_pulse'
  | 'evening_wrap'

export const reminderSlotNames: ReminderSlotName[] = [
  'morning_brief',
  'midday_check',
  'afternoon_pulse',
  'evening_wrap',
]

export type ReminderSchedule = {
  slotName: ReminderSlotName
  hourLocal: number
  isEnabled: boolean
  templateName: string
}

export async function getReminderSchedules(
  userId: string,
): Promise<ReminderSchedule[]> {
  const rows = await withRetry(() =>
    prisma.reminderSchedule.findMany({
      where: { userId },
      select: {
        slotName: true,
        hourLocal: true,
        isEnabled: true,
        templateName: true,
      },
    }),
  )
  return rows.map((r) => ({
    slotName: r.slotName as ReminderSlotName,
    hourLocal: r.hourLocal,
    isEnabled: r.isEnabled,
    templateName: r.templateName,
  }))
}

export const reminderUpdateSchema = z.object({
  schedules: z
    .array(
      z.object({
        slotName: z.enum([
          'morning_brief',
          'midday_check',
          'afternoon_pulse',
          'evening_wrap',
        ]),
        hourLocal: z.number().int().min(0).max(23),
        isEnabled: z.boolean(),
        templateName: z.string().trim().min(1).max(80),
      }),
    )
    .min(1)
    .max(4),
})
export type ReminderUpdateInput = z.infer<typeof reminderUpdateSchema>

export async function upsertReminderSchedules(
  userId: string,
  raw: unknown,
): Promise<ReminderSchedule[]> {
  const { schedules } = reminderUpdateSchema.parse(raw)
  await prisma.$transaction(
    schedules.map((s) =>
      prisma.reminderSchedule.upsert({
        where: { userId_slotName: { userId, slotName: s.slotName } },
        create: {
          userId,
          slotName: s.slotName,
          hourLocal: s.hourLocal,
          isEnabled: s.isEnabled,
          templateName: s.templateName,
        },
        update: {
          hourLocal: s.hourLocal,
          isEnabled: s.isEnabled,
          templateName: s.templateName,
        },
      }),
    ),
  )
  return getReminderSchedules(userId)
}
