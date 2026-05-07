import type {
  PostCallTranscriptionData,
  TranscriptTurn,
} from '@/lib/elevenlabs/types'
import type { Prisma } from '@bathla-cos/database'

/**
 * Mapping shape that lines up 1:1 with `prisma.conversationMessage.createMany`.
 * Keep field names identical to the Prisma model so the call site can spread
 * directly without per-field renames.
 */
export interface MappedMessageInput {
  direction: 'inbound' | 'outbound'
  messageType: 'text' | 'voice_transcribed' | 'system'
  content: string
  agentToolCalls: Prisma.InputJsonValue | null
  metadata: Prisma.InputJsonObject
}

/**
 * ElevenLabs transcript turns → ConversationMessage rows.
 *
 * Notes:
 *   - The per-turn medium isn't reliably exposed in the payload, so we use
 *     the conversation-level `has_user_audio` flag as the heuristic for
 *     whether user turns came in as voice. WhatsApp text-only conversations
 *     have `has_user_audio=false` and produce `messageType='text'`.
 *   - Tool-call-only turns (`message=null` with non-empty tool_calls) are
 *     preserved with placeholder content so the audit timeline is complete.
 *   - Empty turns (no message AND no tool calls) are skipped — these are
 *     usually placeholders ElevenLabs emits between speech detections.
 */
export function mapTranscriptToMessages(
  data: PostCallTranscriptionData,
): MappedMessageInput[] {
  if (!Array.isArray(data.transcript)) return []
  const userTurnsAreVoice = data.has_user_audio === true

  return data.transcript
    .map((turn, idx) => mapTurn(turn, idx, userTurnsAreVoice))
    .filter((m): m is MappedMessageInput => m !== null)
}

function mapTurn(
  turn: TranscriptTurn,
  index: number,
  userTurnsAreVoice: boolean,
): MappedMessageInput | null {
  const hasMessage =
    typeof turn.message === 'string' && turn.message.trim().length > 0
  const hasTools =
    (turn.tool_calls?.length ?? 0) > 0 || (turn.tool_results?.length ?? 0) > 0
  if (!hasMessage && !hasTools) return null

  const direction: MappedMessageInput['direction'] =
    turn.role === 'user' ? 'inbound' : 'outbound'
  const messageType: MappedMessageInput['messageType'] =
    turn.role === 'user' && userTurnsAreVoice ? 'voice_transcribed' : 'text'

  const content = turn.message ?? '[tool_call_only]'

  const agentToolCalls: Prisma.InputJsonValue | null = hasTools
    ? ({
        calls: (turn.tool_calls ?? []) as unknown as Prisma.InputJsonValue,
        results: (turn.tool_results ?? []) as unknown as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue)
    : null

  return {
    direction,
    messageType,
    content,
    agentToolCalls,
    metadata: {
      turn_index: index,
      time_in_call_secs: turn.time_in_call_secs ?? null,
      conversation_turn_metrics:
        (turn.conversation_turn_metrics as Prisma.InputJsonValue | null) ??
        null,
      role: turn.role,
    },
  }
}
