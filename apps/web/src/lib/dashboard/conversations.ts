import { z } from 'zod'
import { Prisma } from '@bathla-cos/database'
import { prisma, withRetry } from '@/lib/prisma'

/**
 * Conversations list + detail queries for the admin dashboard. Reads only —
 * mutations on conversations are intentionally out of scope (the rows are
 * webhook-sourced transcripts, immutable).
 */

export const callSuccessfulValues = ['success', 'failure', 'unknown'] as const
export type CallSuccessful = (typeof callSuccessfulValues)[number]

export const channelValues = ['whatsapp', 'dashboard_chat'] as const
export type Channel = (typeof channelValues)[number]

export const conversationsListQuerySchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  success: z.enum(callSuccessfulValues).optional(),
  channel: z.enum(channelValues).optional(),
  language: z.string().trim().min(1).max(40).optional(),
  userId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export type ConversationsListQuery = z.infer<typeof conversationsListQuerySchema>

const sessionForList = {
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
} satisfies Prisma.ConversationSessionSelect

export type ConversationListItem = Prisma.ConversationSessionGetPayload<{
  select: typeof sessionForList
}> & { durationSecs: number | null }

export type ConversationsListResult = {
  data: ConversationListItem[]
  total: number
  page: number
  limit: number
}

export async function listConversations(
  raw: unknown,
): Promise<ConversationsListResult> {
  const q = conversationsListQuerySchema.parse(raw)

  const where: Prisma.ConversationSessionWhereInput = {}
  if (q.success) where.callSuccessful = q.success
  if (q.channel) where.channel = q.channel
  if (q.language) where.mainLanguage = q.language
  if (q.userId) where.userId = q.userId
  if (q.from || q.to) {
    where.startedAt = {
      ...(q.from && { gte: q.from }),
      ...(q.to && { lte: q.to }),
    }
  }
  if (q.search) {
    where.OR = [
      { analysisTitle: { contains: q.search, mode: 'insensitive' } },
      { analysisSummary: { contains: q.search, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { displayName: { contains: q.search, mode: 'insensitive' } },
            { phoneE164: { contains: q.search, mode: 'insensitive' } },
          ],
        },
      },
    ]
  }

  const [rows, total] = await Promise.all([
    withRetry(() =>
      prisma.conversationSession.findMany({
        where,
        select: sessionForList,
        orderBy: { startedAt: 'desc' },
        take: q.limit,
        skip: (q.page - 1) * q.limit,
      }),
    ),
    withRetry(() => prisma.conversationSession.count({ where })),
  ])

  const data = rows.map((s) => ({
    ...s,
    durationSecs:
      s.startedAt && s.endedAt
        ? Math.max(
            0,
            Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 1000),
          )
        : null,
  }))

  return { data, total, page: q.page, limit: q.limit }
}

// ────────────────────────────────────────────────────────────────────────────
// Detail

// Detail select — intentionally does NOT include `messages`. The transcript
// stays in the database for replay/training but isn't loaded on this page;
// ElevenLabs already renders transcripts well in their own UI, and the
// analysis (summary, evaluation, cost, raw payload) is what we surface here.
const sessionForDetail = {
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
  textOnly: true,
  whatsappUserId: true,
  whatsappPhoneNumberId: true,
  elevenlabsAgentId: true,
  elevenlabsConversationId: true,
  metadata: true,
  analysisRaw: true,
  chargingRaw: true,
  user: {
    select: {
      id: true,
      displayName: true,
      image: true,
      phoneE164: true,
      timezone: true,
    },
  },
} satisfies Prisma.ConversationSessionSelect

export type ConversationDetailPayload = Prisma.ConversationSessionGetPayload<{
  select: typeof sessionForDetail
}> & {
  durationSecs: number | null
  webhookAuditId: string | null
}

export async function getConversationDetail(
  id: string,
): Promise<ConversationDetailPayload | null> {
  const session = await withRetry(() =>
    prisma.conversationSession.findUnique({
      where: { id },
      select: sessionForDetail,
    }),
  )
  if (!session) return null

  // Loose link to the audit row — WebhookAudit.sessionId is filled in by the
  // post-call ingest pipeline. Drop a separate lookup here so the detail page
  // can deep-link into observability.
  const audit = await withRetry(() =>
    prisma.webhookAudit.findFirst({
      where: { sessionId: id },
      select: { id: true },
      orderBy: { receivedAt: 'desc' },
    }),
  )

  return {
    ...session,
    durationSecs:
      session.startedAt && session.endedAt
        ? Math.max(
            0,
            Math.round(
              (session.endedAt.getTime() - session.startedAt.getTime()) /
                1000,
            ),
          )
        : null,
    webhookAuditId: audit?.id ?? null,
  }
}
