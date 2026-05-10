'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/features/dashboard/components/empty-state'
import { relativeTime } from '@/features/dashboard/lib/format'
import { JobStatusChip } from './job-status-chip'
import { JobTypeChip } from './job-type-chip'
import { JobOutcomeCell } from './job-outcome-cell'
import {
  patchSearchParams,
  searchParamsToString,
} from '@/features/jobs/lib/url-state'
import type { JobListItem } from '@/lib/dashboard/jobs'

export function JobsTable({ rows }: { rows: JobListItem[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No jobs match these filters"
        description="Try widening the type / status filter, or clear the search."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Attempt</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Outcome</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <Row key={r.id} row={r} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Row({ row }: { row: JobListItem }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const initials = row.user
    ? row.user.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : null

  const attemptOver = row.attempt >= row.maxAttempts

  const open = () => {
    // push so back-button closes the drawer; preserve all other filters.
    const next = patchSearchParams(sp, { selected: row.id }, { resetPage: false })
    router.push(`${pathname}${searchParamsToString(next)}`)
  }

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer"
      onClick={open}
    >
      <TableCell>
        <JobTypeChip type={row.jobType} />
      </TableCell>
      <TableCell className="text-center">
        <JobStatusChip status={row.status} />
      </TableCell>
      <TableCell
        className={
          attemptOver
            ? 'text-rose-600 dark:text-rose-400 text-center text-xs tabular-nums'
            : 'text-muted-foreground text-center text-xs tabular-nums'
        }
      >
        {row.attempt}/{row.maxAttempts}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {relativeTime(row.scheduledFor)}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {formatDuration(row.durationMs)}
      </TableCell>
      <TableCell>
        {row.user ? (
          <div className="flex items-center gap-2">
            <Avatar className="size-6">
              {row.user.image && <AvatarImage src={row.user.image} alt="" />}
              <AvatarFallback className="text-[10px]">
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm leading-tight">
              {row.user.displayName}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs italic">system</span>
        )}
      </TableCell>
      <TableCell className="max-w-[360px]">
        <JobOutcomeCell job={row} />
      </TableCell>
    </TableRow>
  )
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  const m = Math.floor(s / 60)
  return `${m}m ${Math.round(s % 60)}s`
}
