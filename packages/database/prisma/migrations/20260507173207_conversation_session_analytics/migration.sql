-- ConversationSession analytics extension.
--
-- Real WhatsApp post-call payloads carry far more usable data than the
-- previous schema captured: per-call cost in credits, analysis verdict +
-- summary, channel-specific WhatsApp ids, language, and a full charging
-- breakdown. This migration extracts the small set of fields the analytics
-- dashboard / conversation detail view will index against, and parks the
-- remaining detail (evaluation criteria, data collection, charging
-- internals) into JSONB blobs for drill-down.

ALTER TABLE "ConversationSession"
  ADD COLUMN "cost_credits"             INTEGER,
  ADD COLUMN "call_successful"          TEXT,
  ADD COLUMN "analysis_title"           TEXT,
  ADD COLUMN "analysis_summary"         TEXT,
  ADD COLUMN "whatsapp_user_id"         TEXT,
  ADD COLUMN "whatsapp_phone_number_id" TEXT,
  ADD COLUMN "elevenlabs_agent_id"      TEXT,
  ADD COLUMN "main_language"            TEXT,
  ADD COLUMN "text_only"                BOOLEAN,
  ADD COLUMN "analysis_raw"             JSONB,
  ADD COLUMN "charging_raw"             JSONB;

-- The previous webhook_audit_v2 migration replaced this index with a UNIQUE
-- constraint (ConversationSession_elevenlabs_conversation_id_key). The schema
-- still listed `@@index([elevenlabsConversationId])` though, so this DROP
-- aligns reality with the new schema declaration.
DROP INDEX IF EXISTS "ConversationSession_elevenlabs_conversation_id_idx";

-- Composite for analytics: per-user cost over time. The cost column is the
-- third sort key only because Postgres can still use the index for the
-- (user_id, created_at) prefix without it.
CREATE INDEX "ConversationSession_user_id_created_at_cost_credits_idx"
  ON "ConversationSession" ("user_id", "created_at" DESC, "cost_credits");

-- Success-rate dashboards: filter by outcome, sorted by recency.
CREATE INDEX "ConversationSession_call_successful_created_at_idx"
  ON "ConversationSession" ("call_successful", "created_at" DESC);

-- Filter "show all sessions for this WhatsApp number" without unwinding JSON.
CREATE INDEX "ConversationSession_whatsapp_user_id_idx"
  ON "ConversationSession" ("whatsapp_user_id");
