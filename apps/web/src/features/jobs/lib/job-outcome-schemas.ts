import { z } from 'zod'
import { JobType } from '@bathla-cos/database'

/**
 * Defensive Zod parsers for `Job.payload` and `Job.output`. Each parser is
 * scoped to a single `JobType`; the renderer in `job-outcome-cell.tsx` uses
 * `safeParse` and falls back to the generic "Success" / payload-fragment text
 * when a row's JSON has drifted.
 *
 * Add new shapes here as new job types ship — never `as any` against
 * `Prisma.JsonValue` in the renderer.
 */

// ── daily_summarization ─────────────────────────────────────────────────────
export const dailySummarizationOutputSchema = z
  .object({
    post_result: z
      .object({
        summary_date: z.string().optional(),
        decision_count: z.number().optional(),
        emotional_tone: z.string().optional(),
        tomorrow_focus_len: z.number().optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough()

export const dailySummarizationPayloadSchema = z
  .object({
    summary_date: z.string().optional(),
    user_timezone: z.string().optional(),
  })
  .passthrough()

// ── weekly_summarization ────────────────────────────────────────────────────
export const weeklySummarizationOutputSchema = z
  .object({
    post_result: z
      .object({
        week_start: z.string().optional(),
        week_end: z.string().optional(),
        productivity_score: z.number().optional(),
      })
      .partial()
      .optional(),
  })
  .passthrough()

// ── reminder_send ───────────────────────────────────────────────────────────
export const reminderSendPayloadSchema = z
  .object({
    slot: z.string().optional(),
    template_name: z.string().optional(),
    whatsapp_user_id: z.string().optional(),
    template_language_code: z.string().optional(),
  })
  .passthrough()

// ── reminder_check_run ──────────────────────────────────────────────────────
export const reminderCheckRunOutputSchema = z
  .object({
    users_evaluated: z.number().optional(),
    messages_sent: z.number().optional(),
    messages_skipped: z.number().optional(),
  })
  .passthrough()

// ── whatsapp_quality_poll ───────────────────────────────────────────────────
export const whatsappQualityPollOutputSchema = z
  .object({
    quality_rating: z.string().optional(),
    messaging_limit: z.string().optional(),
  })
  .passthrough()

// ── archive_messages ────────────────────────────────────────────────────────
export const archiveMessagesOutputSchema = z
  .object({
    archived_count: z.number().optional(),
  })
  .passthrough()

// ── onboarding_optin ────────────────────────────────────────────────────────
export const onboardingOptinPayloadSchema = z
  .object({
    phone_e164: z.string().optional(),
  })
  .passthrough()

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  reminder_send: 'Reminder send',
  reminder_check_run: 'Reminder check',
  daily_summarization: 'Daily summary',
  weekly_summarization: 'Weekly summary',
  whatsapp_quality_poll: 'WA quality poll',
  archive_messages: 'Archive messages',
  onboarding_optin: 'Onboarding opt-in',
}

export const JOB_TYPE_OPTIONS: Array<{ value: JobType; label: string }> = (
  Object.values(JobType) as JobType[]
).map((t) => ({ value: t, label: JOB_TYPE_LABEL[t] }))
