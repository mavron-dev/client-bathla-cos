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
    const userIdField = data.user_id ?? '(none)'
    const waPhone = data.metadata?.whatsapp?.whatsapp_user_id ?? '(none)'
    return {
      status: 'orphaned',
      reason: `No user matched. user_id=${userIdField}, whatsapp_user_id=${waPhone}`,
    }
  }

  // 2) Compute timestamps from ElevenLabs metadata
  const startUnix = data.metadata?.start_time_unix_secs
  const durationSecs = data.metadata?.call_duration_secs ?? 0
  const startedAt = startUnix ? new Date(startUnix * 1000) : new Date()
  const endedAt = startUnix
    ? new Date((startUnix + durationSecs) * 1000)
    : new Date()

  // 3) Build the persisted blobs.
  //
  // Hot-path fields are extracted into typed columns below (analytics dashboards
  // hit them via indexes). The full-fidelity raw blobs preserve every field
  // from the upstream payload for drill-down on the conversation detail view,
  // and the slim `sessionMetadata` keeps the leftover odds and ends that
  // don't merit their own columns.

  const analysis = data.analysis ?? null
  const charging = data.metadata?.charging ?? null
  const whatsapp = data.metadata?.whatsapp ?? null

  const analysisRaw: Prisma.InputJsonValue | null = analysis
    ? ({
        evaluation_criteria_results:
          (analysis.evaluation_criteria_results as
            | Prisma.InputJsonValue
            | undefined) ?? {},
        data_collection_results:
          (analysis.data_collection_results as
            | Prisma.InputJsonValue
            | undefined) ?? {},
        evaluation_criteria_results_list:
          (analysis.evaluation_criteria_results_list as
            | Prisma.InputJsonValue
            | undefined) ?? [],
        data_collection_results_list:
          (analysis.data_collection_results_list as
            | Prisma.InputJsonValue
            | undefined) ?? [],
      } as Prisma.InputJsonValue)
    : null

  const chargingRaw: Prisma.InputJsonValue | null = charging
    ? (charging as unknown as Prisma.InputJsonValue)
    : null

  // Slim metadata: only the bits that aren't extracted into columns above.
  const sessionMetadata: Prisma.InputJsonObject = {
    termination_reason: data.metadata?.termination_reason ?? null,
    feedback:
      (data.metadata?.feedback as Prisma.InputJsonValue | undefined) ?? null,
    timezone: data.metadata?.timezone ?? null,
    warnings:
      (data.metadata?.warnings as Prisma.InputJsonValue | undefined) ?? [],
    initiator_id: data.metadata?.initiator_id ?? null,
    dynamic_variables:
      (data.conversation_initiation_client_data?.dynamic_variables as
        | Prisma.InputJsonValue
        | undefined) ?? null,
    conversation_config_override:
      (data.conversation_initiation_client_data
        ?.conversation_config_override as
        | Prisma.InputJsonValue
        | undefined) ?? null,
    has_audio: data.has_audio ?? false,
    has_user_audio: data.has_user_audio ?? false,
    has_response_audio: data.has_response_audio ?? false,
    whatsapp_direction: whatsapp?.direction ?? null,
    status: data.status,
    tag_ids: data.tag_ids ?? [],
  }

  // 4) Map transcript turns to message rows
  const mapped = mapTranscriptToMessages(data)

  // 5) Atomic upsert + bulk insert
  const result = await prisma.$transaction(async (tx) => {
    // Column writes are split out so the create + update branches share
    // the same payload (Prisma doesn't have a `set:` shorthand for upsert).
    const sessionWrites = {
      endedAt,
      messageCount: mapped.length,
      metadata: sessionMetadata,
      costCredits: data.metadata?.cost ?? null,
      callSuccessful: analysis?.call_successful ?? null,
      analysisTitle: analysis?.call_summary_title ?? null,
      analysisSummary: analysis?.transcript_summary ?? null,
      whatsappUserId: whatsapp?.whatsapp_user_id ?? null,
      whatsappPhoneNumberId: whatsapp?.whatsapp_phone_number_id ?? null,
      elevenlabsAgentId: data.agent_id,
      mainLanguage: data.metadata?.main_language ?? null,
      textOnly: data.metadata?.text_only ?? null,
      analysisRaw: analysisRaw ?? Prisma.JsonNull,
      chargingRaw: chargingRaw ?? Prisma.JsonNull,
    }

    const session = await tx.conversationSession.upsert({
      where: { elevenlabsConversationId: data.conversation_id },
      create: {
        userId: user.id,
        elevenlabsConversationId: data.conversation_id,
        channel: 'whatsapp',
        startedAt,
        ...sessionWrites,
      },
      update: sessionWrites,
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
