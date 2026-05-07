import { z } from 'zod'
import { prisma, withRetry } from '@/lib/prisma'

/**
 * Analytics queries for the /admin/analytics page. One exported function per
 * tab. All date bucketing uses `to_char(... AT TIME ZONE 'Asia/Kolkata',
 * 'YYYY-MM-DD')` returning TEXT — never `date_trunc` returning a `timestamp
 * without time zone` (the pg-types parser interprets that in the Node
 * process's local TZ and silently flips dates around IST midnight).
 */

const APP_TZ_LITERAL = `'Asia/Kolkata'` as const

export const rangeSchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
})

export type AnalyticsRange = z.infer<typeof rangeSchema>

/** Convert preset like '7d' / '30d' / '90d' to a {from, to} range. */
export function rangeFromPreset(
  preset: string,
  now: Date = new Date(),
): AnalyticsRange {
  const days = preset === '7d' ? 7 : preset === '90d' ? 90 : 30
  const to = now
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return { from, to }
}

// ────────────────────────────────────────────────────────────────────────────
// Overview tab

export type OverviewKPI = {
  totalConversations: number
  totalCost: number
  totalMessages: number
  avgDurationSecs: number
  successRate: number // 0..1
  avgCostPerConversation: number
}

export type DualAxisPoint = {
  date: string
  conversations: number
  cost: number
}

export type LanguageMixSlice = {
  language: string
  count: number
}

export type TopUserBar = {
  userId: string
  displayName: string
  image: string | null
  conversations: number
}

export type OverviewAnalytics = {
  kpis: OverviewKPI
  conversationsVsCost: DualAxisPoint[]
  topUsers: TopUserBar[]
  languageMix: LanguageMixSlice[]
}

export async function getOverviewAnalytics(
  range: AnalyticsRange,
): Promise<OverviewAnalytics> {
  const [kpiRow, dailyRows, topUserRows, langRows] = await Promise.all([
    withRetry(() =>
      prisma.$queryRaw<
        {
          conversations: bigint
          total_cost: bigint
          total_messages: bigint
          avg_duration_secs: number | null
          successful: bigint
        }[]
      >`
        SELECT
          COUNT(*)                                              AS conversations,
          COALESCE(SUM("cost_credits"), 0)                      AS total_cost,
          COALESCE(SUM("message_count"), 0)                     AS total_messages,
          AVG(EXTRACT(EPOCH FROM ("ended_at" - "started_at")))  AS avg_duration_secs,
          COUNT(*) FILTER (WHERE "call_successful" = 'success') AS successful
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<
        { day: string; conversations: bigint; cost: bigint }[]
      >`
        SELECT
          to_char("started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COUNT(*)                                              AS conversations,
          COALESCE(SUM("cost_credits"), 0)                      AS cost
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
        GROUP BY day
        ORDER BY day ASC
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<
        {
          user_id: string
          display_name: string
          image: string | null
          conversations: bigint
        }[]
      >`
        SELECT
          u."id"            AS user_id,
          u."display_name"  AS display_name,
          u."image"         AS image,
          COUNT(cs."id")    AS conversations
        FROM "User" u
        JOIN "ConversationSession" cs ON cs."user_id" = u."id"
        WHERE cs."started_at" >= ${range.from} AND cs."started_at" < ${range.to}
        GROUP BY u."id", u."display_name", u."image"
        ORDER BY conversations DESC
        LIMIT 5
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<{ language: string | null; count: bigint }[]>`
        SELECT
          "main_language" AS language,
          COUNT(*)        AS count
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
        GROUP BY "main_language"
        ORDER BY count DESC
      `,
    ),
  ])

  const k = kpiRow[0]
  const conversations = Number(k?.conversations ?? 0)
  const totalCost = Number(k?.total_cost ?? 0)
  const successful = Number(k?.successful ?? 0)

  const kpis: OverviewKPI = {
    totalConversations: conversations,
    totalCost,
    totalMessages: Number(k?.total_messages ?? 0),
    avgDurationSecs: Number(k?.avg_duration_secs ?? 0) || 0,
    successRate: conversations > 0 ? successful / conversations : 0,
    avgCostPerConversation:
      conversations > 0 ? Math.round(totalCost / conversations) : 0,
  }

  return {
    kpis,
    conversationsVsCost: dailyRows.map((r) => ({
      date: r.day,
      conversations: Number(r.conversations),
      cost: Number(r.cost),
    })),
    topUsers: topUserRows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      image: r.image,
      conversations: Number(r.conversations),
    })),
    languageMix: langRows.map((r) => ({
      language: r.language ?? 'unknown',
      count: Number(r.count),
    })),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Cost tab

export type CostAnalytics = {
  costStackedByDay: { date: string; llm: number; call: number; tts: number }[]
  costPerUser: {
    userId: string
    displayName: string
    image: string | null
    cost: number
  }[]
  cacheHitRateOverTime: { date: string; hitRate: number }[]
  costByModel: {
    model: string
    cost: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
  }[]
}

export async function getCostAnalytics(
  range: AnalyticsRange,
): Promise<CostAnalytics> {
  const [stackedRows, perUserRows, cacheRows, modelRows] = await Promise.all([
    // Daily cost split into LLM (cents → credits) + call_charge + a TTS proxy.
    // chargingRaw stores `llm_charge` and `call_charge` as integer credits.
    // We approximate TTS = total_credits - llm_charge - call_charge so the
    // stacked area reconciles to the headline cost number.
    withRetry(() =>
      prisma.$queryRaw<
        {
          day: string
          llm: bigint
          call: bigint
          tts: bigint
        }[]
      >`
        SELECT
          to_char("started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COALESCE(SUM(("charging_raw"->>'llm_charge')::int), 0)          AS llm,
          COALESCE(SUM(("charging_raw"->>'call_charge')::int), 0)         AS call,
          GREATEST(
            COALESCE(SUM("cost_credits"), 0)
              - COALESCE(SUM(("charging_raw"->>'llm_charge')::int), 0)
              - COALESCE(SUM(("charging_raw"->>'call_charge')::int), 0),
            0
          )                                                                AS tts
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
        GROUP BY day
        ORDER BY day ASC
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<
        {
          user_id: string
          display_name: string
          image: string | null
          cost: bigint
        }[]
      >`
        SELECT
          u."id"                                          AS user_id,
          u."display_name"                                AS display_name,
          u."image"                                       AS image,
          COALESCE(SUM(cs."cost_credits"), 0)             AS cost
        FROM "User" u
        JOIN "ConversationSession" cs ON cs."user_id" = u."id"
        WHERE cs."started_at" >= ${range.from} AND cs."started_at" < ${range.to}
        GROUP BY u."id", u."display_name", u."image"
        ORDER BY cost DESC
      `,
    ),
    // Cache hit rate per day. Walks the per-model breakdown in
    // charging_raw->llm_usage->irreversible_generation->model_usage and
    // computes SUM(cache_read_tokens) / SUM(cache_read_tokens + input_tokens).
    withRetry(() =>
      prisma.$queryRaw<{ day: string; hit_rate: number | null }[]>`
        SELECT
          day,
          CASE
            WHEN SUM(cache_read_tokens + input_tokens) = 0 THEN NULL
            ELSE SUM(cache_read_tokens)::float
                 / NULLIF(SUM(cache_read_tokens + input_tokens), 0)
          END AS hit_rate
        FROM (
          SELECT
            to_char(cs."started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
            COALESCE((m.usage->'input_cache_read'->>'tokens')::int, 0) AS cache_read_tokens,
            COALESCE((m.usage->'input'->>'tokens')::int, 0)            AS input_tokens
          FROM "ConversationSession" cs
          CROSS JOIN LATERAL jsonb_each(
            COALESCE(
              cs."charging_raw"->'llm_usage'->'irreversible_generation'->'model_usage',
              '{}'::jsonb
            )
          ) AS m(model_name, usage)
          WHERE cs."charging_raw" IS NOT NULL
            AND cs."started_at" >= ${range.from} AND cs."started_at" < ${range.to}
        ) sub
        GROUP BY day
        ORDER BY day ASC
      `,
    ),
    // Per-model cost rollup. The `price` fields in charging_raw are USD
    // floats; we sum them and round to credits via the conversation total
    // proportion (handled at render time — the table just shows USD).
    withRetry(() =>
      prisma.$queryRaw<
        {
          model: string
          cost_usd: number
          input_tokens: bigint
          output_tokens: bigint
          cache_read_tokens: bigint
          cache_write_tokens: bigint
        }[]
      >`
        SELECT
          model_name AS model,
          SUM(
            COALESCE((usage->'input'->>'price')::numeric, 0)
            + COALESCE((usage->'output_total'->>'price')::numeric, 0)
            + COALESCE((usage->'input_cache_read'->>'price')::numeric, 0)
            + COALESCE((usage->'input_cache_write'->>'price')::numeric, 0)
          )::float AS cost_usd,
          SUM(COALESCE((usage->'input'->>'tokens')::int, 0))                AS input_tokens,
          SUM(COALESCE((usage->'output_total'->>'tokens')::int, 0))         AS output_tokens,
          SUM(COALESCE((usage->'input_cache_read'->>'tokens')::int, 0))     AS cache_read_tokens,
          SUM(COALESCE((usage->'input_cache_write'->>'tokens')::int, 0))    AS cache_write_tokens
        FROM (
          SELECT
            cs."id",
            m.model_name,
            m.usage
          FROM "ConversationSession" cs
          CROSS JOIN LATERAL jsonb_each(
            COALESCE(
              cs."charging_raw"->'llm_usage'->'irreversible_generation'->'model_usage',
              '{}'::jsonb
            )
          ) AS m(model_name, usage)
          WHERE cs."charging_raw" IS NOT NULL
            AND cs."started_at" >= ${range.from} AND cs."started_at" < ${range.to}
        ) sub
        GROUP BY model_name
        ORDER BY cost_usd DESC
      `,
    ),
  ])

  return {
    costStackedByDay: stackedRows.map((r) => ({
      date: r.day,
      llm: Number(r.llm),
      call: Number(r.call),
      tts: Number(r.tts),
    })),
    costPerUser: perUserRows.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      image: r.image,
      cost: Number(r.cost),
    })),
    cacheHitRateOverTime: cacheRows.map((r) => ({
      date: r.day,
      hitRate: r.hit_rate ?? 0,
    })),
    costByModel: modelRows.map((r) => ({
      model: r.model,
      cost: Number(r.cost_usd),
      inputTokens: Number(r.input_tokens),
      outputTokens: Number(r.output_tokens),
      cacheReadTokens: Number(r.cache_read_tokens),
      cacheWriteTokens: Number(r.cache_write_tokens),
    })),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Quality tab

export type QualityAnalytics = {
  successRateOverTime: { date: string; successRate: number; total: number }[]
  criteriaPassRate: {
    criterionId: string
    passed: number
    total: number
    passRate: number
  }[]
  dataCollectionCoverage: {
    fieldId: string
    populated: number
    total: number
    coverage: number
  }[]
}

export async function getQualityAnalytics(
  range: AnalyticsRange,
): Promise<QualityAnalytics> {
  const [successRows, criteriaRows, coverageRows] = await Promise.all([
    withRetry(() =>
      prisma.$queryRaw<
        { day: string; total: bigint; successful: bigint }[]
      >`
        SELECT
          to_char("started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COUNT(*)                                              AS total,
          COUNT(*) FILTER (WHERE "call_successful" = 'success') AS successful
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
        GROUP BY day
        ORDER BY day ASC
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<
        { criterion_id: string; passed: bigint; total: bigint }[]
      >`
        SELECT
          criterion_id,
          COUNT(*) FILTER (WHERE result = 'success') AS passed,
          COUNT(*)                                   AS total
        FROM (
          SELECT
            kv.key                AS criterion_id,
            kv.value->>'result'   AS result
          FROM "ConversationSession" cs
          CROSS JOIN LATERAL jsonb_each(
            COALESCE(cs."analysis_raw"->'evaluation_criteria_results', '{}'::jsonb)
          ) AS kv(key, value)
          WHERE cs."analysis_raw" IS NOT NULL
            AND cs."started_at" >= ${range.from} AND cs."started_at" < ${range.to}
        ) sub
        GROUP BY criterion_id
        ORDER BY total DESC
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<
        { field_id: string; populated: bigint; total: bigint }[]
      >`
        SELECT
          field_id,
          COUNT(*) FILTER (
            WHERE value IS NOT NULL AND value::text != 'null'
          ) AS populated,
          COUNT(*) AS total
        FROM (
          SELECT
            kv.key             AS field_id,
            kv.value->'value'  AS value
          FROM "ConversationSession" cs
          CROSS JOIN LATERAL jsonb_each(
            COALESCE(cs."analysis_raw"->'data_collection_results', '{}'::jsonb)
          ) AS kv(key, value)
          WHERE cs."analysis_raw" IS NOT NULL
            AND cs."started_at" >= ${range.from} AND cs."started_at" < ${range.to}
        ) sub
        GROUP BY field_id
        ORDER BY total DESC
      `,
    ),
  ])

  return {
    successRateOverTime: successRows.map((r) => {
      const total = Number(r.total)
      const successful = Number(r.successful)
      return {
        date: r.day,
        total,
        successRate: total > 0 ? successful / total : 0,
      }
    }),
    criteriaPassRate: criteriaRows.map((r) => {
      const passed = Number(r.passed)
      const total = Number(r.total)
      return {
        criterionId: r.criterion_id,
        passed,
        total,
        passRate: total > 0 ? passed / total : 0,
      }
    }),
    dataCollectionCoverage: coverageRows.map((r) => {
      const populated = Number(r.populated)
      const total = Number(r.total)
      return {
        fieldId: r.field_id,
        populated,
        total,
        coverage: total > 0 ? populated / total : 0,
      }
    }),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Engagement tab

export type EngagementAnalytics = {
  heatmap: { dayOfWeek: number; hour: number; count: number }[]
  conversationsPerDay: { date: string; count: number }[]
  dayOfWeekPattern: { dayOfWeek: number; count: number }[]
  durationHistogram: { bucket: string; count: number }[]
}

export async function getEngagementAnalytics(
  range: AnalyticsRange,
): Promise<EngagementAnalytics> {
  const [heatmapRows, dailyRows, dowRows, durationRows] = await Promise.all([
    withRetry(() =>
      prisma.$queryRaw<
        { day_of_week: number; hour: number; count: bigint }[]
      >`
        SELECT
          (EXTRACT(ISODOW FROM "started_at" AT TIME ZONE 'Asia/Kolkata')::int - 1) AS day_of_week,
          EXTRACT(HOUR FROM "started_at" AT TIME ZONE 'Asia/Kolkata')::int        AS hour,
          COUNT(*)                                                                AS count
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
        GROUP BY day_of_week, hour
        ORDER BY day_of_week, hour
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT
          to_char("started_at" AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COUNT(*)                                                         AS count
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
        GROUP BY day
        ORDER BY day ASC
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<{ day_of_week: number; count: bigint }[]>`
        SELECT
          (EXTRACT(ISODOW FROM "started_at" AT TIME ZONE 'Asia/Kolkata')::int - 1) AS day_of_week,
          COUNT(*)                                                                AS count
        FROM "ConversationSession"
        WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
        GROUP BY day_of_week
        ORDER BY day_of_week
      `,
    ),
    withRetry(() =>
      prisma.$queryRaw<{ bucket: string; count: bigint }[]>`
        SELECT bucket, COUNT(*) AS count
        FROM (
          SELECT
            CASE
              WHEN EXTRACT(EPOCH FROM ("ended_at" - "started_at")) < 30 THEN '<30s'
              WHEN EXTRACT(EPOCH FROM ("ended_at" - "started_at")) < 60 THEN '30-60s'
              WHEN EXTRACT(EPOCH FROM ("ended_at" - "started_at")) < 120 THEN '1-2m'
              WHEN EXTRACT(EPOCH FROM ("ended_at" - "started_at")) < 300 THEN '2-5m'
              ELSE '5m+'
            END AS bucket
          FROM "ConversationSession"
          WHERE "started_at" >= ${range.from} AND "started_at" < ${range.to}
            AND "ended_at" IS NOT NULL
        ) sub
        GROUP BY bucket
      `,
    ),
  ])

  return {
    heatmap: heatmapRows.map((r) => ({
      dayOfWeek: Number(r.day_of_week),
      hour: Number(r.hour),
      count: Number(r.count),
    })),
    conversationsPerDay: dailyRows.map((r) => ({
      date: r.day,
      count: Number(r.count),
    })),
    dayOfWeekPattern: dowRows.map((r) => ({
      dayOfWeek: Number(r.day_of_week),
      count: Number(r.count),
    })),
    durationHistogram: durationRows.map((r) => ({
      bucket: r.bucket,
      count: Number(r.count),
    })),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Per-user tab

export type PerUserRow = {
  userId: string
  displayName: string
  image: string | null
  phoneE164: string
  role: string
  conversations: number
  totalCost: number
  avgCost: number
  successRate: number
  lastActive: Date | null
}

export async function getPerUserAnalytics(
  range: AnalyticsRange,
): Promise<PerUserRow[]> {
  const rows = await withRetry(() =>
    prisma.$queryRaw<
      {
        id: string
        display_name: string
        image: string | null
        phone_e164: string
        role: string
        conversations: bigint
        total_cost: bigint
        avg_cost: number | null
        successful: bigint
        last_active: Date | null
      }[]
    >`
      SELECT
        u."id"            AS id,
        u."display_name"  AS display_name,
        u."image"         AS image,
        u."phone_e164"    AS phone_e164,
        u."role"::text    AS role,
        COUNT(cs."id")                                              AS conversations,
        COALESCE(SUM(cs."cost_credits"), 0)                         AS total_cost,
        AVG(cs."cost_credits")                                      AS avg_cost,
        COUNT(cs."id") FILTER (WHERE cs."call_successful" = 'success') AS successful,
        MAX(cs."ended_at")                                          AS last_active
      FROM "User" u
      LEFT JOIN "ConversationSession" cs
        ON cs."user_id" = u."id"
        AND cs."started_at" >= ${range.from}
        AND cs."started_at" < ${range.to}
      WHERE u."is_active" = true
      GROUP BY u."id", u."display_name", u."image", u."phone_e164", u."role"
      ORDER BY total_cost DESC NULLS LAST
    `,
  )

  return rows.map((r) => {
    const conversations = Number(r.conversations)
    const successful = Number(r.successful)
    return {
      userId: r.id,
      displayName: r.display_name,
      image: r.image,
      phoneE164: r.phone_e164,
      role: r.role,
      conversations,
      totalCost: Number(r.total_cost),
      avgCost: Math.round(Number(r.avg_cost ?? 0)),
      successRate: conversations > 0 ? successful / conversations : 0,
      lastActive: r.last_active,
    }
  })
}

// ────────────────────────────────────────────────────────────────────────────
// Heatmap (also used by home page)

export async function getHeatmap(
  daysBack = 30,
): Promise<{ dayOfWeek: number; hour: number; count: number }[]> {
  const rows = await withRetry(() =>
    prisma.$queryRaw<
      { day_of_week: number; hour: number; count: bigint }[]
    >`
      SELECT
        (EXTRACT(ISODOW FROM "started_at" AT TIME ZONE 'Asia/Kolkata')::int - 1) AS day_of_week,
        EXTRACT(HOUR FROM "started_at" AT TIME ZONE 'Asia/Kolkata')::int        AS hour,
        COUNT(*)                                                                AS count
      FROM "ConversationSession"
      WHERE "started_at" >= NOW() - (${daysBack}::int || ' days')::interval
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `,
  )
  return rows.map((r) => ({
    dayOfWeek: Number(r.day_of_week),
    hour: Number(r.hour),
    count: Number(r.count),
  }))
}

// Suppress no-unused-vars on the literal — referenced in comments only.
export const _ANALYTICS_TZ_MARKER = APP_TZ_LITERAL
