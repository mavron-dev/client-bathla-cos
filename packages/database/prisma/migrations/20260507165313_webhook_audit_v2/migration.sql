-- WebhookAudit v2: richer observability for the universal webhook audit log,
-- plus the idempotency anchor on ConversationSession.elevenlabsConversationId
-- so re-deliveries of the same call don't produce duplicate sessions/messages.

-- 1) Idempotency anchor on ConversationSession --------------------------------

DROP INDEX IF EXISTS "ConversationSession_elevenlabs_conversation_id_idx";
CREATE UNIQUE INDEX "ConversationSession_elevenlabs_conversation_id_key"
  ON "ConversationSession" ("elevenlabs_conversation_id");

-- 2) New enum for WebhookAudit.processing_status ------------------------------

CREATE TYPE "WebhookProcessingStatus" AS ENUM (
  'received',
  'invalid',
  'completed',
  'orphaned',
  'skipped',
  'failed'
);

-- 3) Drop old indexes that no longer match the new shape ----------------------

DROP INDEX IF EXISTS "WebhookAudit_source_received_at_idx";
DROP INDEX IF EXISTS "WebhookAudit_processed_received_at_idx";

-- 4) Drop superseded columns --------------------------------------------------
--    `processed` boolean → `processing_status` enum (more granular)
--    `error` text → `processing_error` text (renamed for clarity)

ALTER TABLE "WebhookAudit" DROP COLUMN IF EXISTS "processed";
ALTER TABLE "WebhookAudit" DROP COLUMN IF EXISTS "error";

-- 5) Add new columns ----------------------------------------------------------

ALTER TABLE "WebhookAudit"
  ADD COLUMN "signature_valid"   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "headers"            JSONB,
  ADD COLUMN "processing_status"  "WebhookProcessingStatus" NOT NULL DEFAULT 'received',
  ADD COLUMN "processing_error"   TEXT,
  ADD COLUMN "duration_ms"        INTEGER,
  ADD COLUMN "user_id"            UUID,
  ADD COLUMN "session_id"         UUID;

-- 6) Tighten previously nullable columns to NOT NULL --------------------------
--    Safe because user confirmed the table is empty.

ALTER TABLE "WebhookAudit"
  ALTER COLUMN "source"     SET NOT NULL,
  ALTER COLUMN "event_type" SET NOT NULL,
  ALTER COLUMN "payload"    SET NOT NULL;

-- 7) New indexes --------------------------------------------------------------

CREATE INDEX "WebhookAudit_source_event_type_received_at_idx"
  ON "WebhookAudit" ("source", "event_type", "received_at" DESC);

CREATE INDEX "WebhookAudit_processing_status_received_at_idx"
  ON "WebhookAudit" ("processing_status", "received_at" DESC);

CREATE INDEX "WebhookAudit_user_id_received_at_idx"
  ON "WebhookAudit" ("user_id", "received_at" DESC);
