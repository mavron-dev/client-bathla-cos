import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconX,
  IconHelp,
  IconAlertTriangle,
  IconClock,
} from '@tabler/icons-react'
import PageContainer from '@/components/layout/page-container'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { requireAdminOrDev } from '@/lib/requireAuth'
import { getWebhookAuditDetail } from '@/lib/dashboard/observability'
import { JSONViewer } from '@/features/conversations/components/json-viewer'
import { CopyId } from '@/features/conversations/components/copy-id'
import { ReplayButton } from '@/features/observability/components/replay-button'
import { relativeTime } from '@/features/dashboard/lib/format'

export const dynamic = 'force-dynamic'

export default async function WebhookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminOrDev()
  const { id } = await params
  const audit = await getWebhookAuditDetail(id)
  if (!audit) notFound()

  // Replay is only meaningful for the ElevenLabs post-call transcription
  // events (see /api/admin/webhook-audit/[id]/replay).
  const canReplay =
    audit.source === 'elevenlabs' &&
    audit.eventType === 'post_call_transcription'

  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-6 pt-2 lg:px-6">
        <div>
          <Link
            href="/admin/observability"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          >
            <IconArrowLeft className="size-3.5" />
            Back to observability
          </Link>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              <span className="font-mono text-base sm:text-lg">
                {audit.eventType}
              </span>
            </h1>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <Badge
                variant="outline"
                className="font-mono text-[10px] font-normal"
              >
                {audit.source}
              </Badge>
              <span>·</span>
              <span>Received {relativeTime(audit.receivedAt)}</span>
              {audit.durationMs != null && (
                <>
                  <span>·</span>
                  <span className="tabular-nums">
                    {audit.durationMs}ms processing
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={audit.processingStatus} />
            <SignatureBadge valid={audit.signatureValid} />
            {canReplay && (
              <ReplayButton
                auditId={audit.id}
                reason={
                  canReplay ? undefined : 'Replay only supports ElevenLabs.'
                }
              />
            )}
          </div>
        </div>

        {/* Summary + entity refs */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit row</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="ID">
                <CopyId value={audit.id} display={audit.id} />
              </Row>
              {audit.eventId && (
                <Row label="Event ID">
                  <CopyId value={audit.eventId} display={audit.eventId} />
                </Row>
              )}
              {audit.processingError && (
                <Row label="Error">
                  <span className="text-rose-600 dark:text-rose-400 text-xs leading-snug">
                    {audit.processingError}
                  </span>
                </Row>
              )}
              <Row label="Received">
                <span className="text-xs tabular-nums">
                  {audit.receivedAt.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                  })}
                </span>
              </Row>
              {audit.processedAt && (
                <Row label="Processed">
                  <span className="text-xs tabular-nums">
                    {audit.processedAt.toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </span>
                </Row>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolved entities</CardTitle>
              <CardDescription>
                User + session attached during processing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {audit.user ? (
                <Link
                  href={`/admin/users/${audit.user.id}`}
                  className="hover:bg-muted/40 flex items-center justify-between gap-2 rounded-md px-1.5 py-1"
                >
                  <span>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide block">
                      User
                    </span>
                    <span className="text-sm font-medium">
                      {audit.user.displayName}
                    </span>
                  </span>
                  <IconArrowRight className="text-muted-foreground size-3.5" />
                </Link>
              ) : (
                <Row label="User">
                  <span className="text-muted-foreground text-xs italic">
                    unresolved
                  </span>
                </Row>
              )}
              {audit.sessionId ? (
                <Link
                  href={`/admin/conversations/${audit.sessionId}`}
                  className="hover:bg-muted/40 flex items-center justify-between gap-2 rounded-md px-1.5 py-1"
                >
                  <span>
                    <span className="text-muted-foreground text-xs uppercase tracking-wide block">
                      Conversation
                    </span>
                    <span className="text-sm font-mono">
                      {audit.sessionId.slice(0, 8)}…
                    </span>
                  </span>
                  <IconArrowRight className="text-muted-foreground size-3.5" />
                </Link>
              ) : (
                <Row label="Conversation">
                  <span className="text-muted-foreground text-xs italic">
                    none
                  </span>
                </Row>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Headers</CardTitle>
              <CardDescription>
                Snapshot taken at receipt time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 max-h-[200px] overflow-auto rounded-md p-3">
                <JSONViewer data={audit.headers} initiallyExpanded />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raw payload</CardTitle>
            <CardDescription>
              The exact JSON we received from{' '}
              <span className="font-mono text-xs">{audit.source}</span>. Click
              any nested object to collapse / expand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 max-h-[600px] overflow-auto rounded-md p-4">
              <JSONViewer data={audit.payload} initiallyExpanded />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="min-w-0 max-w-[60%] truncate text-right">{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'completed'
      ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
      : status === 'orphaned'
        ? 'border-amber-500/30 text-amber-600 dark:text-amber-400'
        : status === 'skipped'
          ? 'border-border text-muted-foreground'
          : status === 'failed' || status === 'invalid'
            ? 'border-rose-500/30 text-rose-600 dark:text-rose-400'
            : 'border-sky-500/30 text-sky-600 dark:text-sky-400'

  const Icon =
    status === 'completed'
      ? IconCheck
      : status === 'orphaned'
        ? IconAlertTriangle
        : status === 'skipped'
          ? IconHelp
          : status === 'failed' || status === 'invalid'
            ? IconX
            : IconClock

  return (
    <Badge variant="outline" className={cn('gap-1', tone)}>
      <Icon className="size-3.5" />
      {status}
    </Badge>
  )
}

function SignatureBadge({ valid }: { valid: boolean }) {
  return valid ? (
    <Badge
      variant="outline"
      className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 gap-1"
    >
      <IconCheck className="size-3.5" />
      Signature valid
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-rose-500/30 text-rose-600 dark:text-rose-400 gap-1"
    >
      <IconX className="size-3.5" />
      Signature invalid
    </Badge>
  )
}
