-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('developer', 'admin', 'director', 'manager', 'member');

-- CreateEnum
CREATE TYPE "LanguagePref" AS ENUM ('english', 'hindi', 'hinglish');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'done', 'deferred', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "MessageSource" AS ENUM ('dashboard', 'whatsapp_text', 'whatsapp_voice', 'agent', 'system', 'api');

-- CreateEnum
CREATE TYPE "TaskUpdateType" AS ENUM ('created', 'status_changed', 'priority_changed', 'deadline_changed', 'deferred', 'reminded', 'edited', 'deleted');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('whatsapp', 'dashboard_chat');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'voice', 'voice_transcribed', 'template', 'system');

-- CreateEnum
CREATE TYPE "ReminderSlot" AS ENUM ('morning_brief', 'midday_check', 'afternoon_pulse', 'evening_wrap');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('reminder_send', 'reminder_check_run', 'daily_summarization', 'whatsapp_quality_poll', 'archive_messages', 'onboarding_optin');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'success', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('success', 'partial', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'member',
    "team_id" UUID,
    "language_pref" "LanguagePref" NOT NULL DEFAULT 'hinglish',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "voice_reply_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "opted_in_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "parent_team_id" UUID,
    "lead_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assigned_to" UUID NOT NULL,
    "created_by" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'pending',
    "priority" "TaskPriority" NOT NULL DEFAULT 'medium',
    "deadline" TIMESTAMP(3),
    "deferred_to" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "source" "MessageSource" NOT NULL,
    "recurrence" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_reminded_at" TIMESTAMP(3),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskUpdate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "updated_by" UUID,
    "update_type" "TaskUpdateType" NOT NULL,
    "source" "MessageSource" NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "conversation_message_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "elevenlabs_conversation_id" TEXT,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'whatsapp',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "message_type" "MessageType" NOT NULL,
    "template_name" TEXT,
    "template_variables" JSONB,
    "content" TEXT NOT NULL,
    "voice_url" TEXT,
    "voice_duration_seconds" INTEGER,
    "agent_tool_calls" JSONB,
    "whatsapp_message_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationSummary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "summary_date" DATE NOT NULL,
    "summary_text" TEXT NOT NULL,
    "key_decisions" JSONB,
    "task_state_snapshot" JSONB,
    "emotional_tone" TEXT,
    "communication_pattern" TEXT,
    "message_count" INTEGER,
    "token_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSchedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "slot_name" "ReminderSlot" NOT NULL,
    "hour_local" INTEGER NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "template_name" TEXT NOT NULL,
    "conditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReminderSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "job_type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "output" JSONB,
    "external_ref_id" TEXT,
    "external_status" INTEGER,
    "error" TEXT,
    "user_id" UUID,
    "task_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageProcessing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_message_id" UUID,
    "user_id" UUID,
    "whatsapp_message_id" TEXT,
    "received_at" TIMESTAMP(3),
    "agent_called_at" TIMESTAMP(3),
    "tools_called_at" TIMESTAMP(3),
    "db_updated_at" TIMESTAMP(3),
    "reply_sent_at" TIMESTAMP(3),
    "total_latency_ms" INTEGER,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'success',
    "error_message" TEXT,
    "error_stack" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageProcessing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappQualityLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone_number_id" TEXT NOT NULL,
    "quality_rating" TEXT,
    "status" TEXT,
    "messaging_limit" TEXT,
    "raw_payload" JSONB,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappQualityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookAudit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" TEXT,
    "event_type" TEXT,
    "event_id" TEXT,
    "payload" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "WebhookAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_e164_key" ON "User"("phone_e164");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_team_id_idx" ON "User"("team_id");

-- CreateIndex
CREATE INDEX "User_is_active_idx" ON "User"("is_active");

-- CreateIndex
CREATE INDEX "Team_parent_team_id_idx" ON "Team"("parent_team_id");

-- CreateIndex
CREATE INDEX "Task_assigned_to_status_idx" ON "Task"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "Task_deadline_idx" ON "Task"("deadline");

-- CreateIndex
CREATE INDEX "Task_assigned_to_deadline_idx" ON "Task"("assigned_to", "deadline");

-- CreateIndex
CREATE INDEX "Task_status_deadline_idx" ON "Task"("status", "deadline");

-- CreateIndex
CREATE INDEX "Task_is_deleted_idx" ON "Task"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "TaskUpdate_conversation_message_id_key" ON "TaskUpdate"("conversation_message_id");

-- CreateIndex
CREATE INDEX "TaskUpdate_task_id_created_at_idx" ON "TaskUpdate"("task_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "TaskUpdate_update_type_idx" ON "TaskUpdate"("update_type");

-- CreateIndex
CREATE INDEX "ConversationSession_user_id_started_at_idx" ON "ConversationSession"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "ConversationSession_elevenlabs_conversation_id_idx" ON "ConversationSession"("elevenlabs_conversation_id");

-- CreateIndex
CREATE INDEX "ConversationMessage_user_id_created_at_idx" ON "ConversationMessage"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ConversationMessage_session_id_created_at_idx" ON "ConversationMessage"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "ConversationMessage_whatsapp_message_id_idx" ON "ConversationMessage"("whatsapp_message_id");

-- CreateIndex
CREATE INDEX "ConversationSummary_user_id_summary_date_idx" ON "ConversationSummary"("user_id", "summary_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSummary_user_id_summary_date_key" ON "ConversationSummary"("user_id", "summary_date");

-- CreateIndex
CREATE INDEX "ReminderSchedule_user_id_idx" ON "ReminderSchedule"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSchedule_user_id_slot_name_key" ON "ReminderSchedule"("user_id", "slot_name");

-- CreateIndex
CREATE INDEX "Job_job_type_status_idx" ON "Job"("job_type", "status");

-- CreateIndex
CREATE INDEX "Job_scheduled_for_idx" ON "Job"("scheduled_for");

-- CreateIndex
CREATE INDEX "Job_status_scheduled_for_idx" ON "Job"("status", "scheduled_for");

-- CreateIndex
CREATE INDEX "Job_user_id_idx" ON "Job"("user_id");

-- CreateIndex
CREATE INDEX "Job_created_at_job_type_status_idx" ON "Job"("created_at", "job_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MessageProcessing_conversation_message_id_key" ON "MessageProcessing"("conversation_message_id");

-- CreateIndex
CREATE INDEX "MessageProcessing_user_id_received_at_idx" ON "MessageProcessing"("user_id", "received_at" DESC);

-- CreateIndex
CREATE INDEX "MessageProcessing_status_received_at_idx" ON "MessageProcessing"("status", "received_at" DESC);

-- CreateIndex
CREATE INDEX "WhatsappQualityLog_phone_number_id_checked_at_idx" ON "WhatsappQualityLog"("phone_number_id", "checked_at" DESC);

-- CreateIndex
CREATE INDEX "WebhookAudit_source_received_at_idx" ON "WebhookAudit"("source", "received_at" DESC);

-- CreateIndex
CREATE INDEX "WebhookAudit_event_id_idx" ON "WebhookAudit"("event_id");

-- CreateIndex
CREATE INDEX "WebhookAudit_processed_received_at_idx" ON "WebhookAudit"("processed", "received_at");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_parent_team_id_fkey" FOREIGN KEY ("parent_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_lead_user_id_fkey" FOREIGN KEY ("lead_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUpdate" ADD CONSTRAINT "TaskUpdate_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUpdate" ADD CONSTRAINT "TaskUpdate_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskUpdate" ADD CONSTRAINT "TaskUpdate_conversation_message_id_fkey" FOREIGN KEY ("conversation_message_id") REFERENCES "ConversationMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ConversationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageProcessing" ADD CONSTRAINT "MessageProcessing_conversation_message_id_fkey" FOREIGN KEY ("conversation_message_id") REFERENCES "ConversationMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageProcessing" ADD CONSTRAINT "MessageProcessing_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
