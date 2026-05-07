'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  IconCheck,
  IconX,
  IconHelp,
  IconArrowRight,
} from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { EmptyState } from './empty-state'
import { formatDurationSecs, relativeTime } from '../lib/format'
import type { RecentConversationItem } from '@/lib/dashboard/queries'

const TITLE_MAX = 24

export function RecentConversationsTable({
  conversations,
}: {
  conversations: RecentConversationItem[]
}) {
  return (
    <Card className="@container/card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle>Recent conversations</CardTitle>
          <CardDescription>
            The last {conversations.length} sessions across every user.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/conversations">
            View all
            <IconArrowRight className="ml-1 size-3.5" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {conversations.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              title="No conversations yet"
              description="Once your team starts chatting with Bathla COS over WhatsApp, sessions will appear here."
            />
          </div>
        ) : (
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
                    <ConversationRow key={c.id} conversation={c} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}

function ConversationRow({
  conversation,
}: {
  conversation: RecentConversationItem
}) {
  const router = useRouter()
  const initials = conversation.user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const titleFull = conversation.analysisTitle ?? 'Untitled'
  const titleShort = truncate(titleFull, TITLE_MAX)
  const tooltipBody =
    conversation.analysisSummary && conversation.analysisSummary !== titleFull
      ? `${titleFull} — ${conversation.analysisSummary}`
      : titleFull

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer"
      onClick={() => router.push(`/admin/conversations/${conversation.id}`)}
    >
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            {conversation.user.image && (
              <AvatarImage src={conversation.user.image} alt="" />
            )}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">
              {conversation.user.displayName}
            </span>
            <span className="text-muted-foreground text-xs leading-tight">
              {conversation.user.phoneE164}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm tabular-nums">
        {relativeTime(conversation.startedAt)}
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {conversation.durationSecs
          ? formatDurationSecs(conversation.durationSecs)
          : '—'}
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
        {conversation.costCredits != null
          ? `${conversation.costCredits.toLocaleString('en-IN')} credits`
          : '—'}
      </TableCell>
      <TableCell className="text-center">
        <OutcomeBadge status={conversation.callSuccessful} />
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
