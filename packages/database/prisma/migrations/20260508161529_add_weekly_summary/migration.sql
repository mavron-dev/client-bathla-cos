-- AlterEnum
ALTER TYPE "JobType" ADD VALUE 'weekly_summarization';

-- CreateTable
CREATE TABLE "ConversationWeeklySummary" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "week_start_date" DATE NOT NULL,
    "week_end_date" DATE NOT NULL,
    "summary_text" TEXT NOT NULL,
    "key_themes" JSONB,
    "task_metrics" JSONB,
    "productivity_score" INTEGER,
    "pattern_insights" JSONB,
    "daily_summary_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "token_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationWeeklySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationWeeklySummary_user_id_week_start_date_idx" ON "ConversationWeeklySummary"("user_id", "week_start_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationWeeklySummary_user_id_week_start_date_key" ON "ConversationWeeklySummary"("user_id", "week_start_date");

-- AddForeignKey
ALTER TABLE "ConversationWeeklySummary" ADD CONSTRAINT "ConversationWeeklySummary_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
