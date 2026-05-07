import { prisma } from '@/lib/prisma'
import { Prisma } from '@bathla-cos/database'
import { resolveUserFromTranscription } from './resolve-user'
import { mapTranscriptToMessages } from './map-transcript'
import type { PostCallTranscriptionData } from '@/lib/elevenlabs/types'

/**
 * Ingest a verified `post_call_transcription` payload.
 *
 * Idempotency:
 *   - Session: keyed by `elevenlabs_conversation_id` (unique). Re-deliveries
 *     hit the same row via `upsert`.
 *   - Messages: pre-insert count check inside the transaction. If any message
 *     row already exists for this session, we skip the bulk insert entirely.
 *
 * Atomicity: session upsert + message insert wrapped in `prisma.$transaction`,
 * so a partial failure can't leave the DB with a session but no messages.
 */
export type IngestOutcome =
  | {
      status: 'completed'
      userId: string
      sessionId: string
      messagesInserted: number
      resolvedVia: string
    }
  | { status: 'orphaned'; reason: string }
  | { status: 'duplicate'; userId: string; sessionId: string }

export async function ingestPostCallTranscription(
  data: PostCallTranscriptionData,
): Promise<IngestOutcome> {
  // 1) Resolve user
  const user = await resolveUserFromTranscription(data)
  if (!user) {
    const phoneAttempted = data.metadata?.phone_call?.external_number ?? '(none)'
    const userIdAttempted = data.user_id ?? '(none)'
    return {
      status: 'orphaned',
      reason: `No user matched. user_id=${userIdAttempted}, phone=${phoneAttempted}`,
    }
  }

  // 2) Compute timestamps from ElevenLabs metadata
  const startUnix = data.metadata?.start_time_unix_secs
  const durationSecs = data.metadata?.call_duration_secs ?? 0
  const startedAt = startUnix ? new Date(startUnix * 1000) : new Date()
  const endedAt = startUnix
    ? new Date((startUnix + durationSecs) * 1000)
    : new Date()

  // 3) Build the session metadata blob — captures the analysis summary
  // alongside the raw conversation, so a future summarization cron has
  // everything in one place.
  const configOverride = data.conversation_initiation_client_data
    ?.conversation_config_override as
    | { agent?: { language?: string } }
    | undefined
  const sessionMetadata: Prisma.InputJsonObject = {
    elevenlabs_agent_id: data.agent_id,
    elevenlabs_user_id: data.user_id ?? null,
    transcript_summary: data.analysis?.transcript_summary ?? null,
    call_successful: data.analysis?.call_successful ?? null,
    evaluation_criteria_results:
      (data.analysis?.evaluation_criteria_results as
        | Prisma.InputJsonValue
        | undefined) ?? null,
    data_collection_results:
      (data.analysis?.data_collection_results as
        | Prisma.InputJsonValue
        | undefined) ?? null,
    main_language: configOverride?.agent?.language ?? null,
    cost: data.metadata?.cost ?? null,
    has_audio: data.has_audio ?? false,
    has_user_audio: data.has_user_audio ?? false,
    has_response_audio: data.has_response_audio ?? false,
    termination_reason: data.metadata?.termination_reason ?? null,
    dynamic_variables:
      (data.conversation_initiation_client_data?.dynamic_variables as
        | Prisma.InputJsonValue
        | undefined) ?? null,
  }

  // 4) Map transcript turns to message rows
  const mapped = mapTranscriptToMessages(data)

  // 5) Atomic upsert + bulk insert
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.conversationSession.upsert({
      where: { elevenlabsConversationId: data.conversation_id },
      create: {
        userId: user.id,
        elevenlabsConversationId: data.conversation_id,
        channel: 'whatsapp',
        startedAt,
        endedAt,
        messageCount: mapped.length,
        metadata: sessionMetadata,
      },
      update: {
        endedAt,
        messageCount: mapped.length,
        metadata: sessionMetadata,
      },
      select: { id: true },
    })

    // Idempotency on messages: if any rows already exist for this session,
    // assume a prior delivery handled it and don't double-insert.
    const existing = await tx.conversationMessage.count({
      where: { sessionId: session.id },
    })

    if (existing > 0) {
      return { sessionId: session.id, inserted: 0, duplicate: true as const }
    }

    if (mapped.length > 0) {
      await tx.conversationMessage.createMany({
        data: mapped.map((m) => ({
          userId: user.id,
          sessionId: session.id,
          direction: m.direction,
          messageType: m.messageType,
          content: m.content,
          agentToolCalls: m.agentToolCalls ?? Prisma.JsonNull,
          metadata: m.metadata,
        })),
      })
    }

    return {
      sessionId: session.id,
      inserted: mapped.length,
      duplicate: false as const,
    }
  })

  if (result.duplicate) {
    return { status: 'duplicate', userId: user.id, sessionId: result.sessionId }
  }

  return {
    status: 'completed',
    userId: user.id,
    sessionId: result.sessionId,
    messagesInserted: result.inserted,
    resolvedVia: user.resolvedVia,
  }
}
