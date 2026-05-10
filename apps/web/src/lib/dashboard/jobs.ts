import { z } from 'zod'
import { Prisma, JobStatus, JobType } from '@bathla-cos/database'
import { prisma, withRetry } from '@/lib/prisma'
import { ApiAuthError } from '@/lib/api-auth'

/**
 * Jobs dashboard queries: KPI rollup + filterable list + detail + retry.
 * Mirrors `lib/dashboard/observability.ts` in shape (Zod query schema, batched
 * user lookup, offset pagination). Lives behind admin/dev-only routes — the
 * payload/output JSON can leak template params, transcripts, and external ids.
 */

// ────────────────────────────────────────────────────────────────────────────
// Stats

export type JobStats = {
  pending: number
  running: number
  failed24h: number
  total24h: number
  succeeded24h: number
  /** 0..1; null when total24h == 0 (no denominator). */
  successRate24h: number | null
}

export async function getJobStats(): Promise<JobStats> {
  const rows = await withRetry(() =>
    prisma.$queryRaw<
      {
        pending: bigint
        running: bigint
        failed_24h: bigint
        total_24h: bigint
        succeeded_24h: bigint
      }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')                                   AS pending,
        COUNT(*) FILTER (WHERE status = 'running')                                   AS running,
        COUNT(*) FILTER (
          WHERE status = 'failed' AND finished_at >= NOW() - INTERVAL '24 hours'
        )                                                                            AS failed_24h,
        COUNT(*) FILTER (
          WHERE status IN ('success','failed','skipped')
            AND finished_at >= NOW() - INTERVAL '24 hours'
        )                                                                            AS total_24h,
        COUNT(*) FILTER (
          WHERE status = 'success' AND finished_at >= NOW() - INTERVAL '24 hours'
        )                                                                            AS succeeded_24h
      FROM "Job"
    `,
  )
  const r = rows[0]
  const total24h = Number(r?.total_24h ?? 0)
  const succeeded24h = Number(r?.succeeded_24h ?? 0)
  return {
    pending: Number(r?.pending ?? 0),
    running: Number(r?.running ?? 0),
    failed24h: Number(r?.failed_24h ?? 0),
    total24h,
    succeeded24h,
    successRate24h: total24h > 0 ? succeeded24h / total24h : null,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// List

const stringOrArray = z.union([z.string(), z.array(z.string())])

function toArray<T>(v: T | T[] | undefined): T[] | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v : [v]
}

export const jobsListQuerySchema = z.object({
  type: stringOrArray.optional(),
  status: stringOrArray.optional(),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type JobsListQuery = z.infer<typeof jobsListQuerySchema>

export type JobListItem = {
  id: string
  jobType: JobType
  status: JobStatus
  attempt: number
  maxAttempts: number
  scheduledFor: Date
  startedAt: Date | null
  finishedAt: Date | null
  durationMs: number | null
  externalRefId: string | null
  externalStatus: number | null
  error: string | null
  payload: Prisma.JsonValue
  output: Prisma.JsonValue
  user: {
    id: string
    displayName: string
    image: string | null
  } | null
}

export type JobsListResult = {
  data: JobListItem[]
  total: number
  page: number
  limit: number
}

export async function listJobs(raw: unknown): Promise<JobsListResult> {
  const q = jobsListQuerySchema.parse(raw)

  const types = toArray(q.type)
    ?.map((t) => t as JobType)
    .filter((t) => Object.values(JobType).includes(t))
  const statuses = toArray(q.status)
    ?.map((s) => s as JobStatus)
    .filter((s) => Object.values(JobStatus).includes(s))

  const where: Prisma.JobWhereInput = {}
  if (types && types.length > 0) where.jobType = { in: types }
  if (statuses && statuses.length > 0) where.status = { in: statuses }
  if (q.userId) where.userId = q.userId
  if (q.from || q.to) {
    where.scheduledFor = {
      ...(q.from && { gte: q.from }),
      ...(q.to && { lte: q.to }),
    }
  }
  if (q.search) {
    // v1: search the error column + externalRefId. JSON-payload search is
    // possible via raw SQL but rarely useful — defer until we have a concrete
    // need.
    where.OR = [
      { error: { contains: q.search, mode: 'insensitive' } },
      { externalRefId: { contains: q.search, mode: 'insensitive' } },
    ]
  }

  const [rows, total] = await Promise.all([
    withRetry(() =>
      prisma.job.findMany({
        where,
        // (scheduledFor DESC, id DESC) — id is the stable secondary key. No
        // compound index today; fine for current table size. Future tuning:
        // `CREATE INDEX ON "Job" (scheduled_for DESC, id DESC)`.
        orderBy: [{ scheduledFor: 'desc' }, { id: 'desc' }],
        take: q.limit,
        skip: (q.page - 1) * q.limit,
        select: {
          id: true,
          jobType: true,
          status: true,
          attempt: true,
          maxAttempts: true,
          scheduledFor: true,
          startedAt: true,
          finishedAt: true,
          durationMs: true,
          externalRefId: true,
          externalStatus: true,
          error: true,
          payload: true,
          output: true,
          userId: true,
        },
      }),
    ),
    withRetry(() => prisma.job.count({ where })),
  ])

  // Loose FK — resolve user displayName in one batched lookup. Mirrors
  // `listWebhookAudit`.
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
      jobType: r.jobType,
      status: r.status,
      attempt: r.attempt,
      maxAttempts: r.maxAttempts,
      scheduledFor: r.scheduledFor,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      durationMs: r.durationMs,
      externalRefId: r.externalRefId,
      externalStatus: r.externalStatus,
      error: r.error,
      payload: r.payload,
      output: r.output,
      user: r.userId ? (userById.get(r.userId) ?? null) : null,
    })),
    total,
    page: q.page,
    limit: q.limit,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Detail

export type JobDetailPayload = JobListItem & {
  taskId: string | null
  createdAt: Date
  updatedAt: Date
}

export async function getJobDetail(id: string): Promise<JobDetailPayload | null> {
  const row = await withRetry(() => prisma.job.findUnique({ where: { id } }))
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
    jobType: row.jobType,
    status: row.status,
    attempt: row.attempt,
    maxAttempts: row.maxAttempts,
    scheduledFor: row.scheduledFor,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    durationMs: row.durationMs,
    externalRefId: row.externalRefId,
    externalStatus: row.externalStatus,
    error: row.error,
    payload: row.payload,
    output: row.output,
    user,
    taskId: row.taskId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Retry

export type RetryResult = {
  id: string
  status: 'pending'
  scheduledFor: Date
}

/**
 * Reset a `failed`/`skipped` job to `pending` so the worker picks it up next
 * cycle. Atomic: a single UPDATE with the eligibility predicate baked in,
 * which is also our concurrency guard — a second concurrent retry just sees 0
 * rows updated and gets a 409.
 *
 * We DO NOT zero `attempt` — the worker is responsible for incrementing it on
 * its next run, and zeroing it would defeat `maxAttempts`.
 */
export async function retryJob(id: string): Promise<RetryResult> {
  const rows = await withRetry(() =>
    prisma.$queryRaw<
      { id: string; status: JobStatus; scheduled_for: Date }[]
    >`
      UPDATE "Job"
      SET    status         = 'pending',
             started_at     = NULL,
             finished_at    = NULL,
             duration_ms    = NULL,
             error          = NULL,
             output         = NULL,
             scheduled_for  = NOW(),
             updated_at     = NOW()
      WHERE  id           = ${id}::uuid
        AND  status       IN ('failed','skipped')
        AND  attempt      < max_attempts
      RETURNING id, status, scheduled_for
    `,
  )

  if (rows.length === 0) {
    throw new ApiAuthError(
      409,
      'CONFLICT',
      'Job is no longer retryable (already running or attempts exhausted)',
    )
  }

  const r = rows[0]
  return {
    id: r.id,
    status: 'pending',
    scheduledFor: new Date(r.scheduled_for),
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Filter helpers

export type JobUserOption = {
  id: string
  displayName: string
  image: string | null
}

/**
 * Used by the Jobs filter bar to populate the User combobox. We pull only
 * users that have at least one job row to keep the list tight.
 */
export async function listUsersWithJobs(): Promise<JobUserOption[]> {
  const grouped = await withRetry(() =>
    prisma.job.groupBy({
      by: ['userId'],
      where: { userId: { not: null } },
      _count: { _all: true },
    }),
  )
  const ids = grouped
    .map((g) => g.userId)
    .filter((id): id is string => !!id)
  if (ids.length === 0) return []
  const users = await withRetry(() =>
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, displayName: true, image: true },
      orderBy: { displayName: 'asc' },
    }),
  )
  return users
}
