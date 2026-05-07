import { prisma, withRetry } from '@/lib/prisma'
import { Prisma, WebhookProcessingStatus } from '@bathla-cos/database'

/**
 * Thin helpers around the WebhookAudit table. The audit log is the universal
 * inbox for every external webhook (ElevenLabs now, Meta/cost-tracker later)
 * — every endpoint creates exactly one row per delivery, then updates it
 * with the processing outcome. The raw payload is preserved on every row,
 * so failed deliveries can be replayed by re-running the processor against
 * `payload.data`.
 */

export type { WebhookProcessingStatus }

export async function createAuditRow(args: {
  source: string
  eventType: string
  eventId: string | null
  signatureValid: boolean
  payload: Prisma.InputJsonValue
  headers: Record<string, string>
  processingStatus: WebhookProcessingStatus
  processingError?: string
}): Promise<string> {
  const row = await withRetry(() =>
    prisma.webhookAudit.create({
      data: {
        source: args.source,
        eventType: args.eventType,
        eventId: args.eventId,
        signatureValid: args.signatureValid,
        payload: args.payload,
        headers: args.headers as unknown as Prisma.InputJsonValue,
        processingStatus: args.processingStatus,
        processingError: args.processingError ?? null,
      },
      select: { id: true },
    }),
  )
  return row.id
}

export async function updateAuditRow(
  id: string,
  patch: {
    processingStatus?: WebhookProcessingStatus
    processingError?: string | null
    userId?: string | null
    sessionId?: string | null
    durationMs?: number
    processedAt?: Date
  },
): Promise<void> {
  await withRetry(() =>
    prisma.webhookAudit.update({
      where: { id },
      data: {
        ...(patch.processingStatus !== undefined && {
          processingStatus: patch.processingStatus,
        }),
        ...(patch.processingError !== undefined && {
          processingError: patch.processingError,
        }),
        ...(patch.userId !== undefined && { userId: patch.userId }),
        ...(patch.sessionId !== undefined && { sessionId: patch.sessionId }),
        ...(patch.durationMs !== undefined && {
          durationMs: patch.durationMs,
        }),
        processedAt: patch.processedAt ?? new Date(),
      },
    }),
  )
}
