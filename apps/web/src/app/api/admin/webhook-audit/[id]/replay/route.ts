import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { ingestPostCallTranscription } from '@/lib/conversations/ingest-post-call'
import { updateAuditRow } from '@/lib/webhooks/audit'
import type { PostCallTranscriptionData } from '@/lib/elevenlabs/types'

type Params = { params: Promise<{ id: string }> }

/**
 * Replay a stored audit row through the same ingest pipeline. Useful when
 * processing failed and we want to retry from the preserved payload (e.g.
 * after fixing a bug in resolve-user, or after a transient DB outage).
 *
 * Auth: admin/dev SESSION only — explicitly NOT api-key. Replay touches the
 * conversation tables, so we don't want the agent (or anything caller-mode)
 * to be able to trigger it.
 *
 * Currently scoped to ElevenLabs `post_call_transcription` rows. Adding
 * other replayable types in the future is a switch on `audit.source`.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    if (
      ctx.kind !== 'session' ||
      (ctx.role !== 'admin' && ctx.role !== 'developer')
    ) {
      throw new ApiAuthError(
        403,
        'FORBIDDEN',
        'Only admin or developer can replay webhook audit rows',
      )
    }

    const audit = await prisma.webhookAudit.findUnique({ where: { id } })
    if (!audit) {
      throw new ApiAuthError(404, 'NOT_FOUND', 'Audit row not found')
    }

    if (
      audit.source !== 'elevenlabs' ||
      audit.eventType !== 'post_call_transcription'
    ) {
      throw new ApiAuthError(
        400,
        'BAD_REQUEST',
        'Replay only supports elevenlabs post_call_transcription rows',
      )
    }

    const payload = audit.payload as { data?: PostCallTranscriptionData } | null
    if (!payload?.data) {
      throw new ApiAuthError(
        400,
        'BAD_REQUEST',
        'Audit row has no `data` to replay',
      )
    }

    const t0 = Date.now()
    try {
      const outcome = await ingestPostCallTranscription(payload.data)
      await updateAuditRow(id, {
        processingStatus:
          outcome.status === 'orphaned' ? 'orphaned' : 'completed',
        processingError:
          outcome.status === 'orphaned' ? outcome.reason : null,
        userId: 'userId' in outcome ? outcome.userId : null,
        sessionId: 'sessionId' in outcome ? outcome.sessionId : null,
        durationMs: Date.now() - t0,
      })
      return NextResponse.json({ data: { ok: true, outcome } })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await updateAuditRow(id, {
        processingStatus: 'failed',
        processingError: message,
        durationMs: Date.now() - t0,
      })
      return NextResponse.json(
        { error: message, code: 'REPLAY_FAILED' },
        { status: 500 },
      )
    }
  } catch (err) {
    return jsonError(err)
  }
}
