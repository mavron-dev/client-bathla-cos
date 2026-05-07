import { z } from 'zod'
import { Prisma, WebhookProcessingStatus } from '@bathla-cos/database'
import { prisma, withRetry } from '@/lib/prisma'

/**
 * Observability dashboard queries: webhook health rollup + audit log list +
 * detail. Lives behind admin/dev-only routes; the audit table can leak
 * payloads, signatures, and conversation contents.
 */

export type ObservabilityHealth = {
  total24h: number
  completed24h: number
  failed24h: number
  successRate24h: number
  p50: number | null
  p95: number | null
  p99: number | null
  whatsappQuality: {
    rating: string | null
    status: string | null
    messagingLimit: string | null
    checkedAt: Date | null
  } | null
}

export async function getObservabilityHealth(): Promise<ObservabilityHealth> {
  const [statRow, qualityRow] = await Promise.all([
    withRetry(() =>
      prisma.$queryRaw<
        {
          total_24h: bigint
          completed_24h: bigint
          failed_24h: bigint
          p50: number | null
          p95: number | null
          p99: number | null
        }[]
      >`
        SELECT
          COUNT(*) FILTER (
            WHERE "received_at" >= NOW() - INTERVAL '24 hours'
          ) AS total_24h,
          COUNT(*) FILTER (
            WHERE "received_at" >= NOW() - INTERVAL '24 hours'
              AND "processing_status" = 'completed'
          ) AS completed_24h,
          COUNT(*) FILTER (
            WHERE "received_at" >= NOW() - INTERVAL '24 hours'
              AND "processing_status" IN ('failed', 'invalid')
          ) AS failed_24h,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "duration_ms")
            FILTER (
              WHERE "received_at" >= NOW() - INTERVAL '24 hours'
                AND "duration_ms" IS NOT NULL
            ) AS p50,
          PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "duration_ms")
            FILTER (
              WHERE "received_at" >= NOW() - INTERVAL '24 hours'
                AND "duration_ms" IS NOT NULL
            ) AS p95,
          PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "duration_ms")
            FILTER (
              WHERE "received_at" >= NOW() - INTERVAL '24 hours'
                AND "duration_ms" IS NOT NULL
            ) AS p99
        FROM "WebhookAudit"
      `,
    ),
    withRetry(() =>
      prisma.whatsappQualityLog.findFirst({
        orderBy: { checkedAt: 'desc' },
        select: {
          qualityRating: true,
          status: true,
          messagingLimit: true,
          checkedAt: true,
        },
      }),
    ),
  ])

  const s = statRow[0]
  const total = Number(s?.total_24h ?? 0)
  const completed = Number(s?.completed_24h ?? 0)
  return {
    total24h: total,
    completed24h: completed,
    failed24h: Number(s?.failed_24h ?? 0),
    successRate24h: total > 0 ? completed / total : 0,
    p50: s?.p50 ?? null,
    p95: s?.p95 ?? null,
    p99: s?.p99 ?? null,
    whatsappQuality: qualityRow
      ? {
          rating: qualityRow.qualityRating,
          status: qualityRow.status,
          messagingLimit: qualityRow.messagingLimit,
          checkedAt: qualityRow.checkedAt,
        }
      : null,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Audit log list

export const webhookAuditQuerySchema = z.object({
  source: z.string().trim().min(1).max(40).optional(),
  eventType: z.string().trim().min(1).max(80).optional(),
  status: z
    .enum([
      'received',
      'invalid',
      'completed',
      'orphaned',
      'skipped',
      'failed',
    ])
    .optional(),
  signatureValid: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type WebhookAuditQuery = z.infer<typeof webhookAuditQuerySchema>

export type WebhookAuditListItem = {
  id: string
  source: string
  eventType: string
  eventId: string | null
  signatureValid: boolean
  processingStatus: WebhookProcessingStatus
  durationMs: number | null
  receivedAt: Date
  processedAt: Date | null
  user: { id: string; displayName: string; image: string | null } | null
}

export type WebhookAuditListResult = {
  data: WebhookAuditListItem[]
  total: number
  page: number
  limit: number
}

export async function listWebhookAudit(
  raw: unknown,
): Promise<WebhookAuditListResult> {
  const q = webhookAuditQuerySchema.parse(raw)

  const where: Prisma.WebhookAuditWhereInput = {}
  if (q.source) where.source = q.source
  if (q.eventType) where.eventType = q.eventType
  if (q.status) where.processingStatus = q.status
  if (q.signatureValid !== undefined) where.signatureValid = q.signatureValid
  if (q.userId) where.userId = q.userId
  if (q.from || q.to) {
    where.receivedAt = {
      ...(q.from && { gte: q.from }),
      ...(q.to && { lte: q.to }),
    }
  }

  const [rows, total] = await Promise.all([
    withRetry(() =>
      prisma.webhookAudit.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        select: {
          id: true,
          source: true,
          eventType: true,
          eventId: true,
          signatureValid: true,
          processingStatus: true,
          durationMs: true,
          receivedAt: true,
          processedAt: true,
          userId: true,
        },
      }),
    ),
    withRetry(() => prisma.webhookAudit.count({ where })),
  ])

  // Resolve user displayName for the rows that have a userId. One small
  // findMany batched lookup so we don't N+1.
  const userIds = Array.from(
    new Set(rows.map((r) => r.userId).filter((id): id is string => !!id)),
  )
  const users =
    userIds.length === 0
      ? []
      : await withRetry(() =>
          prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, displayName: true, image: true },
          }),
        )
  const userById = new Map(users.map((u) => [u.id, u]))

  return {
    data: rows.map((r) => ({
      id: r.id,
      source: r.source,
      eventType: r.eventType,
      eventId: r.eventId,
      signatureValid: r.signatureValid,
      processingStatus: r.processingStatus,
      durationMs: r.durationMs,
      receivedAt: r.receivedAt,
      processedAt: r.processedAt,
      user: r.userId ? (userById.get(r.userId) ?? null) : null,
    })),
    total,
    page: q.page,
    limit: q.limit,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Audit detail

export type WebhookAuditDetailPayload = {
  id: string
  source: string
  eventType: string
  eventId: string | null
  signatureValid: boolean
  processingStatus: WebhookProcessingStatus
  processingError: string | null
  durationMs: number | null
  receivedAt: Date
  processedAt: Date | null
  payload: unknown
  headers: unknown
  user: { id: string; displayName: string; image: string | null } | null
  sessionId: string | null
}

export async function getWebhookAuditDetail(
  id: string,
): Promise<WebhookAuditDetailPayload | null> {
  const row = await withRetry(() =>
    prisma.webhookAudit.findUnique({ where: { id } }),
  )
  if (!row) return null

  const user = row.userId
    ? await withRetry(() =>
        prisma.user.findUnique({
          where: { id: row.userId! },
          select: { id: true, displayName: true, image: true },
        }),
      )
    : null

  return {
    id: row.id,
    source: row.source,
    eventType: row.eventType,
    eventId: row.eventId,
    signatureValid: row.signatureValid,
    processingStatus: row.processingStatus,
    processingError: row.processingError,
    durationMs: row.durationMs,
    receivedAt: row.receivedAt,
    processedAt: row.processedAt,
    payload: row.payload,
    headers: row.headers,
    user,
    sessionId: row.sessionId,
  }
}
