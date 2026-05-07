'use client'

import { useRouter } from 'next/navigation'
import {
  IconCheck,
  IconX,
  IconHelp,
  IconAlertTriangle,
  IconClock,
} from '@tabler/icons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/features/dashboard/lib/format'
import { EmptyState } from '@/features/dashboard/components/empty-state'
import type { WebhookAuditListItem } from '@/lib/dashboard/observability'

export function AuditLogTable({ rows }: { rows: WebhookAuditListItem[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No webhook events"
        description="No deliveries match the current filters. Try widening the source / status / signature filters."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source</TableHead>
            <TableHead>Event type</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-center">Sig</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead>Received</TableHead>
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

function Row({ row }: { row: WebhookAuditListItem }) {
  const router = useRouter()
  const initials = row.user
    ? row.user.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : null

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer"
      onClick={() =>
        router.push(`/admin/observability/webhooks/${row.id}`)
      }
    >
      <TableCell>
        <Badge variant="outline" className="font-mono text-[10px] font-normal">
          {row.source}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{row.eventType}</TableCell>
      <TableCell className="text-center">
        <StatusBadge status={row.processingStatus} />
      </TableCell>
      <TableCell className="text-center">
        {row.signatureValid ? (
          <IconCheck
            className="text-emerald-500 inline size-4"
            aria-label="signature valid"
          />
        ) : (
          <IconX
            className="text-rose-500 inline size-4"
            aria-label="signature invalid"
          />
        )}
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
          <span className="text-muted-foreground text-xs italic">
            unresolved
          </span>
        )}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {row.durationMs != null ? `${row.durationMs}ms` : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {relativeTime(row.receivedAt)}
      </TableCell>
    </TableRow>
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
    <Badge variant="outline" className={cn('gap-1 text-[10px]', tone)}>
      <Icon className="size-3" />
      {status}
    </Badge>
  )
}
