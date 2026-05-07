import { NextRequest, NextResponse } from 'next/server'
import {
  verifyElevenLabsWebhook,
  WebhookVerificationError,
} from '@/lib/elevenlabs/webhook-verify'
import { createAuditRow, updateAuditRow } from '@/lib/webhooks/audit'
import { snapshotHeaders } from '@/lib/webhooks/headers'
import { ingestPostCallTranscription } from '@/lib/conversations/ingest-post-call'
import type { Prisma } from '@bathla-cos/database'

/**
 * ElevenLabs post-call webhook receiver.
 *
 * Pipeline: read raw body → verify HMAC → log to WebhookAudit → branch by
 * event type → process inline → update audit row → return 200. Even on
 * failure we always preserve the raw payload in `WebhookAudit.payload` so
 * any delivery can be replayed via the admin replay route.
 *
 * Auth: HMAC ONLY. This route MUST NOT call requireApiAuth — webhooks aren't
 * cookie-bearing and aren't api-key callers. The middleware passthrough on
 * /api/* lets it through; this handler does the only verification.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SOURCE = 'elevenlabs'

export async function POST(req: NextRequest) {
  const t0 = Date.now()

  // Step 1 — read RAW body. Calling .json() here corrupts the HMAC verify
  // because the SDK re-stringifies and the byte-exact form matters.
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'cannot read body' }, { status: 400 })
  }

  const headers = snapshotHeaders(req)
  const sigHeader = req.headers.get('elevenlabs-signature')

  // Step 2 — verify
  let event: { type: string; event_timestamp: number; data: unknown }
  try {
    event = await verifyElevenLabsWebhook(rawBody, sigHeader)
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      // Log the failed attempt with a truncated raw preview — we only need
      // enough to debug, not the entire body (which could be megabytes for
      // accidentally-enabled audio events).
      await createAuditRow({
        source: SOURCE,
        eventType: 'verification_failed',
        eventId: null,
        signatureValid: false,
        payload: {
          _verification_reason: err.reason,
          _raw_preview: rawBody.slice(0, 1000),
        },
        headers,
        processingStatus: 'invalid',
        processingError: err.message,
      })
      return NextResponse.json(
        { error: 'invalid signature' },
        { status: 401 },
      )
    }
    // Non-verify error — usually missing env config. Don't audit-log because
    // we have nothing meaningful to store yet.
    console.error('[webhook/elevenlabs] verification system error', err)
    return NextResponse.json(
      { error: 'verification system error' },
      { status: 500 },
    )
  }

  const eventType = event.type
  const data = event.data as Record<string, unknown> | null
  const eventId =
    typeof data?.conversation_id === 'string'
      ? (data.conversation_id as string)
      : null

  // Step 3 — route by event type. Audio + initiation_failure get logged then
  // skipped. Unknown future event types are also logged so we notice if
  // ElevenLabs adds a new one.

  if (eventType === 'post_call_audio') {
    // Strip the base64 audio before persisting — we don't subscribe to this
    // in POC, but if it arrives we don't want it bloating the audit table.
    const stripped: Prisma.InputJsonValue = {
      type: event.type,
      event_timestamp: event.event_timestamp,
      data: {
        agent_id: (data?.agent_id as string | undefined) ?? null,
        conversation_id:
          (data?.conversation_id as string | undefined) ?? null,
        _audio_omitted: true,
      },
    }
    await createAuditRow({
      source: SOURCE,
      eventType,
      eventId,
      signatureValid: true,
      payload: stripped,
      headers,
      processingStatus: 'skipped',
      processingError: 'audio events not processed in POC',
    })
    return NextResponse.json(
      { ok: true, skipped: 'audio_event' },
      { status: 200 },
    )
  }

  if (eventType === 'call_initiation_failure') {
    await createAuditRow({
      source: SOURCE,
      eventType,
      eventId,
      signatureValid: true,
      payload: event as unknown as Prisma.InputJsonValue,
      headers,
      processingStatus: 'skipped',
      processingError:
        'call_initiation_failure logged but not processed in POC',
    })
    return NextResponse.json(
      { ok: true, skipped: 'initiation_failure' },
      { status: 200 },
    )
  }

  if (eventType !== 'post_call_transcription') {
    await createAuditRow({
      source: SOURCE,
      eventType,
      eventId,
      signatureValid: true,
      payload: event as unknown as Prisma.InputJsonValue,
      headers,
      processingStatus: 'skipped',
      processingError: 'unhandled event type',
    })
    return NextResponse.json(
      { ok: true, skipped: 'unknown_type' },
      { status: 200 },
    )
  }

  // Step 4 — log audit row up front so a process throw still leaves a trail.
  const auditId = await createAuditRow({
    source: SOURCE,
    eventType,
    eventId,
    signatureValid: true,
    payload: event as unknown as Prisma.InputJsonValue,
    headers,
    processingStatus: 'received',
  })

  // Step 5 — process inline.
  try {
    const outcome = await ingestPostCallTranscription(
      event.data as import('@/lib/elevenlabs/types').PostCallTranscriptionData,
    )

    if (outcome.status === 'orphaned') {
      await updateAuditRow(auditId, {
        processingStatus: 'orphaned',
        processingError: outcome.reason,
        durationMs: Date.now() - t0,
      })
      // 200 on purpose — orphan isn't an error from ElevenLabs' POV.
      return NextResponse.json(
        { ok: true, status: 'orphaned' },
        { status: 200 },
      )
    }

    await updateAuditRow(auditId, {
      processingStatus: 'completed',
      userId: outcome.userId,
      sessionId: outcome.sessionId,
      durationMs: Date.now() - t0,
    })

    return NextResponse.json(
      {
        ok: true,
        status: outcome.status,
        session_id: outcome.sessionId,
        messages_inserted:
          'messagesInserted' in outcome ? outcome.messagesInserted : 0,
      },
      { status: 200 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[webhook/elevenlabs] processing failed', err)
    await updateAuditRow(auditId, {
      processingStatus: 'failed',
      processingError: message,
      durationMs: Date.now() - t0,
    })
    // 500 lets ElevenLabs retry if the workspace has retries enabled.
    // Audit row preserves everything for manual replay regardless.
    return NextResponse.json({ error: 'processing failed' }, { status: 500 })
  }
}
