'use client'

import { useRouter } from 'next/navigation'
import {
  IconCheck,
  IconHelp,
  IconX,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  formatDurationSecs,
  relativeTime,
} from '@/features/dashboard/lib/format'
import type { ConversationListItem } from '@/lib/dashboard/conversations'
import { EmptyState } from '@/features/dashboard/components/empty-state'

const TITLE_MAX = 24

export function ConversationsTable({
  conversations,
}: {
  conversations: ConversationListItem[]
}) {
  if (conversations.length === 0) {
    return (
      <EmptyState
        title="No conversations found"
        description="Try widening your filters, or wait for the next WhatsApp conversation to land."
      />
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="min-w-[180px]">Title</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-center">Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.map((c) => (
              <Row key={c.id} c={c} />
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}

function Row({ c }: { c: ConversationListItem }) {
  const router = useRouter()
  const initials = c.user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const titleFull = c.analysisTitle ?? 'Untitled'
  const titleShort = truncate(titleFull, TITLE_MAX)
  const tooltipBody =
    c.analysisSummary && c.analysisSummary !== titleFull
      ? `${titleFull} — ${c.analysisSummary}`
      : titleFull

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer"
      onClick={() => router.push(`/admin/conversations/${c.id}`)}
    >
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            {c.user.image && <AvatarImage src={c.user.image} alt="" />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">
              {c.user.displayName}
            </span>
            <span className="text-muted-foreground text-xs leading-tight">
              {c.user.phoneE164}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm tabular-nums">
        {relativeTime(c.startedAt)}
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {c.durationSecs != null ? formatDurationSecs(c.durationSecs) : '—'}
      </TableCell>
      <TableCell>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-sm font-medium">{titleShort}</span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="start"
            className="max-w-md text-xs leading-relaxed"
          >
            {tooltipBody}
          </TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums">
        {c.costCredits != null
          ? `${c.costCredits.toLocaleString('en-IN')} credits`
          : '—'}
      </TableCell>
      <TableCell className="text-center">
        <OutcomeBadge status={c.callSuccessful} />
      </TableCell>
    </TableRow>
  )
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
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
        <IconCheck className="size-3" />
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
        <IconX className="size-3" />
        Failed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-muted-foreground gap-1">
      <IconHelp className="size-3" />
      Unknown
    </Badge>
  )
}
