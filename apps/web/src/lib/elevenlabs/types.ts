/**
 * ElevenLabs post-call webhook payload types.
 *
 * Source of truth: https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks
 *
 * These types are intentionally permissive — vendor docs evolve, and the
 * audit log preserves the raw payload, so we'd rather pass through unknown
 * fields than throw on a new property. Use `Record<string, unknown>`-style
 * tails on metadata objects so additions don't break compilation.
 */

export type ElevenLabsWebhookEventType =
  | 'post_call_transcription'
  | 'post_call_audio'
  | 'call_initiation_failure'

export interface ElevenLabsWebhookEvent<T = unknown> {
  type: ElevenLabsWebhookEventType | (string & {})
  event_timestamp: number // unix seconds, UTC
  data: T
}

// ─── post_call_transcription ────────────────────────────────────────────────

export interface PostCallTranscriptionData {
  agent_id: string
  conversation_id: string
  status: 'done' | (string & {})
  /** Populated when the agent passed user_id as a dynamic variable on conversation start. */
  user_id?: string
  transcript: TranscriptTurn[]
  metadata: ConversationMetadata
  analysis?: ConversationAnalysis
  conversation_initiation_client_data?: ConversationInitData

  /** Audio-availability flags introduced post-Aug 15 2025. */
  has_audio?: boolean
  has_user_audio?: boolean
  has_response_audio?: boolean
}

export interface TranscriptTurn {
  role: 'agent' | 'user'
  /** null when the turn is tool-call-only (no spoken/typed message). */
  message: string | null
  tool_calls: ToolCall[] | null
  tool_results: ToolResult[] | null
  feedback: unknown | null
  time_in_call_secs: number
  conversation_turn_metrics?: ConversationTurnMetrics | null
}

export interface ToolCall {
  tool_name?: string
  request_id?: string
  params_as_json?: string
  [k: string]: unknown
}

export interface ToolResult {
  tool_name?: string
  request_id?: string
  result_value?: string
  is_error?: boolean
  [k: string]: unknown
}

export interface ConversationTurnMetrics {
  convai_llm_service_ttfb?: { elapsed_time: number }
  convai_llm_service_ttf_sentence?: { elapsed_time: number }
  [k: string]: unknown
}

export interface ConversationMetadata {
  start_time_unix_secs: number
  call_duration_secs: number
  cost?: number
  deletion_settings?: Record<string, unknown>
  feedback?: { overall_score: number | null; likes: number; dislikes: number }
  authorization_method?: string
  charging?: Record<string, unknown>
  termination_reason?: string
  /**
   * Telephony-specific. NOT typically present for WhatsApp conversations.
   * Documented in ElevenLabs telephony docs for Twilio/SIP integrations.
   */
  phone_call?: {
    direction?: 'inbound' | 'outbound'
    external_number?: string
    [k: string]: unknown
  }
  [k: string]: unknown
}

export interface ConversationAnalysis {
  evaluation_criteria_results?: Record<string, unknown>
  data_collection_results?: Record<string, unknown>
  call_successful?: 'success' | 'failure' | 'unknown' | (string & {})
  transcript_summary?: string
}

export interface ConversationInitData {
  conversation_config_override?: Record<string, unknown>
  custom_llm_extra_body?: Record<string, unknown>
  /** Includes user_id when the agent set it on conversation start. */
  dynamic_variables?: Record<string, unknown>
}

// ─── post_call_audio ────────────────────────────────────────────────────────

export interface PostCallAudioData {
  agent_id: string
  conversation_id: string
  /** Base64-encoded MP3. We do NOT store this — the audit row records that
   * audio arrived but strips the bytes. Subscribe-to-audio is disabled in POC. */
  full_audio: string
}

// ─── call_initiation_failure ────────────────────────────────────────────────

export interface CallInitiationFailureData {
  agent_id?: string
  conversation_id?: string
  reason?: string
  [k: string]: unknown
}
