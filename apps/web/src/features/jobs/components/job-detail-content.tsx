'use client'

import Link from 'next/link'
import { IconCopy, IconExternalLink } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { JSONViewer } from '@/features/conversations/components/json-viewer'
import { formatInAppTz } from '@/lib/timezone'
import { JobStatusChip } from './job-status-chip'
import { JobTypeChip } from './job-type-chip'
import { JobRetryButton } from './job-retry-button'
import type { JobDetailPayload } from '@/lib/dashboard/jobs'

export function JobDetailContent({
  job,
  onRetried,
}: {
  job: JobDetailPayload
  onRetried?: () => void
}) {
  const canRetry =
    (job.status === 'failed' || job.status === 'skipped') &&
    job.attempt < job.maxAttempts

  const initials = job.user
    ? job.user.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : null

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(job.id)
      toast.success('Job ID copied')
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div className="space-y-5 px-4 pb-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <JobTypeChip type={job.jobType} />
          <JobStatusChip status={job.status} />
          <Badge variant="outline" className="text-[10px]">
            Attempt {job.attempt}/{job.maxAttempts}
          </Badge>
          {job.externalStatus != null && (
            <Badge variant="outline" className="text-[10px]">
              HTTP {job.externalStatus}
            </Badge>
          )}
        </div>

        <div className="bg-muted/40 grid grid-cols-3 gap-2 rounded-md border p-3 text-xs">
          <Stat label="Scheduled" value={fmt(job.scheduledFor)} />
          <Stat label="Started" value={fmt(job.startedAt)} />
          <Stat
            label="Finished"
            value={fmt(job.finishedAt)}
            sub={
              job.durationMs != null
                ? `${(job.durationMs / 1000).toFixed(2)}s`
                : null
            }
          />
        </div>

        {job.user && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">User:</span>
            <Link
              href={`/admin/users/${job.user.id}`}
              className="bg-muted/40 hover:bg-muted inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs"
            >
              <Avatar className="size-5">
                {job.user.image && <AvatarImage src={job.user.image} alt="" />}
                <AvatarFallback className="text-[9px]">
                  {initials || '?'}
                </AvatarFallback>
              </Avatar>
              <span>{job.user.displayName}</span>
              <IconExternalLink className="size-3 opacity-60" />
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2">
          {canRetry && <JobRetryButton jobId={job.id} onRetried={onRetried} />}
          <Button variant="ghost" size="sm" onClick={copyId} className="gap-2">
            <IconCopy className="size-3.5" />
            Copy job ID
          </Button>
        </div>
      </div>

      {job.error && (
        <div className="space-y-1.5">
          <SectionHeading>Error</SectionHeading>
          <pre className="whitespace-pre-wrap break-words rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
            {job.error}
          </pre>
        </div>
      )}

      <Separator />

      <div className="space-y-1.5">
        <SectionHeading>Payload</SectionHeading>
        <div className="bg-muted/30 rounded-md border p-3">
          <JSONViewer data={job.payload} initiallyExpanded />
        </div>
      </div>

      {job.output != null && (
        <div className="space-y-1.5">
          <SectionHeading>Output</SectionHeading>
          <div className="bg-muted/30 rounded-md border p-3">
            <JSONViewer data={job.output} initiallyExpanded />
          </div>
        </div>
      )}

      {(job.externalRefId || job.taskId) && (
        <div className="space-y-1.5">
          <SectionHeading>External</SectionHeading>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
            {job.externalRefId && (
              <>
                <dt className="text-muted-foreground">Ref ID</dt>
                <dd className="font-mono break-all">{job.externalRefId}</dd>
              </>
            )}
            {job.taskId && (
              <>
                <dt className="text-muted-foreground">Task ID</dt>
                <dd className="font-mono break-all">{job.taskId}</dd>
              </>
            )}
            <dt className="text-muted-foreground">Created</dt>
            <dd>{fmt(job.createdAt)}</dd>
            <dt className="text-muted-foreground">Updated</dt>
            <dd>{fmt(job.updatedAt)}</dd>
          </dl>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string | null
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </div>
      <div className="tabular-nums">{value}</div>
      {sub && <div className="text-muted-foreground text-[10px]">{sub}</div>}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
      {children}
    </h3>
  )
}

function fmt(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return formatInAppTz(date, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}
