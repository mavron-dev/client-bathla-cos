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
  /**
   * Populated when the agent passed user_id as a dynamic variable on
   * conversation start. NOTE: for inbound WhatsApp this field arrives as the
   * user's phone in digits-only form (e.g. "919958841734"), NOT as our
   * internal UUID. The resolver handles both shapes.
   */
  user_id?: string
  transcript: TranscriptTurn[]
  metadata: ConversationMetadata
  analysis?: ConversationAnalysis
  conversation_initiation_client_data?: ConversationInitData
  tag_ids?: string[]

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
  charging?: ChargingBreakdown
  termination_reason?: string
  text_only?: boolean
  timezone?: string
  main_language?: string
  initiator_id?: string | null
  warnings?: unknown[]
  /**
   * WhatsApp channel metadata. The CANONICAL path for resolving the user on
   * inbound WhatsApp conversations — `whatsapp_user_id` is the user's phone
   * as digits (no leading `+`), e.g. "919958841734".
   */
  whatsapp?: {
    direction: 'inbound' | 'outbound'
    whatsapp_user_id: string
    whatsapp_phone_number_id: string
    awaiting_first_user_message?: boolean | null
    [k: string]: unknown
  }
  /**
   * Telephony-specific (Twilio / SIP). Sent as `null` (not omitted) for
   * WhatsApp conversations, so do NOT use presence-of-key to detect channel.
   */
  phone_call?: {
    direction?: 'inbound' | 'outbound'
    external_number?: string
    [k: string]: unknown
  } | null
  /** Reserved for other channels — not parsed today. */
  sms?: unknown
  batch_call?: unknown
  [k: string]: unknown
}

/**
 * `metadata.charging`: per-conversation cost breakdown. The numeric fields
 * mostly arrive as integers (credits) but some (like `llm_price`) are
 * dollar amounts as floats. We don't normalize at the type level — analytics
 * queries should always look at `cost` (the rolled-up integer) for sums.
 */
export interface ChargingBreakdown {
  tier?: string
  is_burst?: boolean
  llm_price?: number
  llm_charge?: number
  call_charge?: number
  dev_discount?: boolean
  free_minutes_consumed?: number
  free_llm_dollars_consumed?: number
  llm_usage?: LlmUsage
  asr_usage?: AsrUsage
  tts_usage?: TtsUsage
  [k: string]: unknown
}

export interface LlmUsage {
  initiated_generation?: { model_usage?: Record<string, ModelUsage> }
  irreversible_generation?: { model_usage?: Record<string, ModelUsage> }
  [k: string]: unknown
}

export interface ModelUsage {
  input?: { price: number; tokens: number }
  output_total?: { price: number; tokens: number }
  input_cache_read?: { price: number; tokens: number }
  input_cache_write?: { price: number; tokens: number }
  [k: string]: unknown
}

export interface AsrUsage {
  asr_model?: string
  total_audio_input_seconds?: number
  total_transcription_calls?: number
  [k: string]: unknown
}

export interface TtsUsage {
  primary_tts_model?: string
  total_characters?: number
  total_audio_output_seconds?: number
  per_voice_usage?: unknown[]
  [k: string]: unknown
}

export interface ConversationAnalysis {
  evaluation_criteria_results?: Record<string, EvaluationResult>
  data_collection_results?: Record<string, DataCollectionResult>
  call_successful?: 'success' | 'failure' | 'unknown' | (string & {})
  /** Multi-sentence narrative description of the conversation. */
  transcript_summary?: string
  /** Short headline string, e.g. "Task Update". */
  call_summary_title?: string
  /** Some payloads also expose the same data as arrays. Keep both shapes. */
  evaluation_criteria_results_list?: EvaluationResult[]
  data_collection_results_list?: DataCollectionResult[]
  scoped?: unknown[]
}

export interface EvaluationResult {
  criteria_id: string
  result: 'success' | 'failure' | 'unknown' | (string & {})
  rationale?: string
  [k: string]: unknown
}

export interface DataCollectionResult {
  data_collection_id: string
  value: string | number | boolean | null
  rationale?: string
  json_schema?: Record<string, unknown>
  [k: string]: unknown
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
