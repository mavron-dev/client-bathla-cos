import type { JobListItem } from '@/lib/dashboard/jobs'
import {
  dailySummarizationOutputSchema,
  weeklySummarizationOutputSchema,
  reminderSendPayloadSchema,
  reminderCheckRunOutputSchema,
  whatsappQualityPollOutputSchema,
  archiveMessagesOutputSchema,
  onboardingOptinPayloadSchema,
} from '@/features/jobs/lib/job-outcome-schemas'

/**
 * One-line outcome renderer per job type. Failed jobs show their truncated
 * error in red; pending / skipped jobs show a payload fragment so the row
 * still says something useful at a glance.
 *
 * Renderers `safeParse` against the shapes in `job-outcome-schemas.ts` and
 * fall back to a generic label when JSON has drifted.
 */
export function JobOutcomeCell({ job }: { job: JobListItem }) {
  if (job.status === 'failed' && job.error) {
    return <ErrorLine text={job.error} />
  }

  switch (job.jobType) {
    case 'daily_summarization': {
      if (job.status === 'success') {
        const parsed = dailySummarizationOutputSchema.safeParse(job.output)
        if (parsed.success && parsed.data.post_result) {
          const r = parsed.data.post_result
          const parts = [
            r.summary_date && `Summary written for ${r.summary_date}`,
            typeof r.decision_count === 'number' &&
              `${r.decision_count} decisions`,
            r.emotional_tone && `tone: ${r.emotional_tone}`,
          ].filter(Boolean)
          if (parts.length > 0) return <Line>{parts.join(' · ')}</Line>
        }
      }
      return <PayloadFragment label="Summary date" path={['summary_date']} job={job} />
    }
    case 'weekly_summarization': {
      if (job.status === 'success') {
        const parsed = weeklySummarizationOutputSchema.safeParse(job.output)
        if (parsed.success && parsed.data.post_result) {
          const r = parsed.data.post_result
          const parts = [
            r.week_start && `Week of ${r.week_start}`,
            typeof r.productivity_score === 'number' &&
              `score ${r.productivity_score}/10`,
          ].filter(Boolean)
          if (parts.length > 0) return <Line>{parts.join(' · ')}</Line>
        }
      }
      return <Line muted>Weekly summarization</Line>
    }
    case 'reminder_send': {
      const parsed = reminderSendPayloadSchema.safeParse(job.payload)
      if (parsed.success) {
        const p = parsed.data
        if (job.status === 'success' && p.template_name && p.whatsapp_user_id) {
          return (
            <Line>
              Sent <Mono>{p.template_name}</Mono> to{' '}
              <Mono>{p.whatsapp_user_id}</Mono>
            </Line>
          )
        }
        if (p.slot)
          return (
            <Line muted>
              Slot: <Mono>{p.slot}</Mono>
            </Line>
          )
      }
      return <Line muted>Reminder</Line>
    }
    case 'reminder_check_run': {
      const parsed = reminderCheckRunOutputSchema.safeParse(job.output)
      if (parsed.success) {
        const o = parsed.data
        const parts = [
          typeof o.users_evaluated === 'number' &&
            `Evaluated ${o.users_evaluated} users`,
          typeof o.messages_sent === 'number' && `${o.messages_sent} sent`,
          typeof o.messages_skipped === 'number' &&
            `${o.messages_skipped} skipped`,
        ].filter(Boolean)
        if (parts.length > 0) return <Line>{parts.join(' · ')}</Line>
      }
      return <Line muted>Reminder check</Line>
    }
    case 'whatsapp_quality_poll': {
      const parsed = whatsappQualityPollOutputSchema.safeParse(job.output)
      if (parsed.success) {
        const o = parsed.data
        const parts = [
          o.quality_rating && `Quality: ${o.quality_rating}`,
          o.messaging_limit && `Tier: ${o.messaging_limit}`,
        ].filter(Boolean)
        if (parts.length > 0) return <Line>{parts.join(' · ')}</Line>
      }
      return <Line muted>WhatsApp quality poll</Line>
    }
    case 'archive_messages': {
      const parsed = archiveMessagesOutputSchema.safeParse(job.output)
      if (parsed.success && typeof parsed.data.archived_count === 'number') {
        return <Line>Archived {parsed.data.archived_count} messages</Line>
      }
      return <Line muted>Archive messages</Line>
    }
    case 'onboarding_optin': {
      const parsed = onboardingOptinPayloadSchema.safeParse(job.payload)
      if (parsed.success && parsed.data.phone_e164) {
        return (
          <Line>
            Sent opt-in to <Mono>{parsed.data.phone_e164}</Mono>
          </Line>
        )
      }
      return <Line muted>Onboarding opt-in</Line>
    }
    default:
      return <Line muted>—</Line>
  }
}

function Line({
  children,
  muted,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <span
      className={
        muted
          ? 'text-muted-foreground line-clamp-1 text-xs'
          : 'line-clamp-1 text-xs'
      }
    >
      {children}
    </span>
  )
}

function ErrorLine({ text }: { text: string }) {
  const truncated = text.length > 80 ? `${text.slice(0, 80)}…` : text
  return (
    <span
      className="line-clamp-1 text-xs text-rose-600 dark:text-rose-400"
      title={text}
    >
      {truncated}
    </span>
  )
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono">{children}</span>
}

function PayloadFragment({
  label,
  path,
  job,
}: {
  label: string
  path: string[]
  job: JobListItem
}) {
  let cursor: unknown = job.payload
  for (const k of path) {
    if (cursor && typeof cursor === 'object' && !Array.isArray(cursor)) {
      cursor = (cursor as Record<string, unknown>)[k]
    } else {
      cursor = undefined
      break
    }
  }
  if (typeof cursor === 'string' || typeof cursor === 'number') {
    return (
      <Line muted>
        {label}: <Mono>{String(cursor)}</Mono>
      </Line>
    )
  }
  return <Line muted>—</Line>
}
