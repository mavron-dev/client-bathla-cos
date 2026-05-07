import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  IconArrowLeft,
  IconMessages,
  IconCheck,
  IconHelp,
  IconX,
} from '@tabler/icons-react'
import PageContainer from '@/components/layout/page-container'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getConversationDetail } from '@/lib/dashboard/conversations'
import {
  formatDurationSecs,
  relativeTime,
} from '@/features/dashboard/lib/format'
import { SummaryCard } from '@/features/conversations/components/summary-card'
import { EvaluationCriteriaCard } from '@/features/conversations/components/evaluation-criteria-card'
import { DataCollectionCard } from '@/features/conversations/components/data-collection-card'
import { CostBreakdownCard } from '@/features/conversations/components/cost-breakdown-card'
import { MetadataCard } from '@/features/conversations/components/metadata-card'
import { RawPayloadCard } from '@/features/conversations/components/raw-payload-card'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function ConversationDetailPage({ params }: Params) {
  const { id } = await params
  const detail = await getConversationDetail(id)
  if (!detail) notFound()

  // analysisRaw shape varies — defensively pull out the two sub-fields and
  // let the cards normalise whatever is inside.
  const analysis = (detail.analysisRaw ?? null) as {
    evaluation_criteria_results?: unknown
    data_collection_results?: unknown
  } | null

  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-6 pt-2 lg:px-6">
        {/* Back link */}
        <div>
          <Link
            href="/admin/conversations"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <IconArrowLeft className="size-3.5" />
            Back to conversations
          </Link>
        </div>

        <Header detail={detail} />

        <div className="flex flex-col gap-4">
          {/* Row 1: prose summary spans the whole row */}
          <SummaryCard summary={detail.analysisSummary} />

          {/* Row 2: cost breakdown — rich content, deserves the full width */}
          <CostBreakdownCard
            chargingRaw={detail.chargingRaw}
            costCredits={detail.costCredits}
          />

          {/* Row 3: three compact analytics cards side-by-side */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <EvaluationCriteriaCard
              results={analysis?.evaluation_criteria_results}
            />
            <DataCollectionCard
              results={analysis?.data_collection_results}
            />
            <MetadataCard
              conversationId={detail.elevenlabsConversationId}
              agentId={detail.elevenlabsAgentId}
              mainLanguage={detail.mainLanguage}
              textOnly={detail.textOnly}
              whatsappPhoneNumberId={detail.whatsappPhoneNumberId}
              channel={detail.channel}
              timezone={detail.user.timezone}
            />
          </div>

          {/* Row 4: raw payload — full width, default expanded */}
          <RawPayloadCard
            data={{
              metadata: detail.metadata,
              analysis_raw: detail.analysisRaw,
              charging_raw: detail.chargingRaw,
            }}
            webhookAuditId={detail.webhookAuditId}
          />
        </div>
      </div>
    </PageContainer>
  )
}

function Header({
  detail,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof getConversationDetail>>>
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {detail.analysisTitle ?? 'Untitled conversation'}
          </h1>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-foreground font-medium">
              {detail.user.displayName}
            </span>
            <span>·</span>
            <span>
              Started{' '}
              <span className="tabular-nums">
                {relativeTime(detail.startedAt)}
              </span>
            </span>
            {detail.durationSecs != null && (
              <>
                <span>·</span>
                <span className="tabular-nums">
                  {formatDurationSecs(detail.durationSecs)} duration
                </span>
              </>
            )}
            <span>·</span>
            <span className="capitalize">{detail.channel}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <OutcomeBadge status={detail.callSuccessful} />
          <Badge variant="outline" className="gap-1">
            <IconMessages className="size-3.5" />
            <span className="tabular-nums">{detail.messageCount} messages</span>
          </Badge>
          {detail.costCredits != null && (
            <Badge variant="outline" className="tabular-nums">
              {detail.costCredits.toLocaleString('en-IN')} credits
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

function OutcomeBadge({ status }: { status: string | null }) {
  if (status === 'success') {
    return (
      <Badge
        variant="outline"
        className={cn(
          'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
          'gap-1',
        )}
      >
        <IconCheck className="size-3.5" />
        Success
      </Badge>
    )
  }
  if (status === 'failure') {
    return (
      <Badge
        variant="outline"
        className="border-rose-500/30 text-rose-600 dark:text-rose-400 gap-1"
      >
        <IconX className="size-3.5" />
        Failed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <IconHelp className="size-3.5" />
      Unknown
    </Badge>
  )
}
