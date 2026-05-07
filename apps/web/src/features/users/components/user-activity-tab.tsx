import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  IconCheck,
  IconHelp,
  IconX,
  IconArrowRight,
} from '@tabler/icons-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { KPICard } from '@/features/dashboard/components/kpi-card'
import {
  formatDurationSecs,
  relativeTime,
} from '@/features/dashboard/lib/format'
import { ConversationsPerDayLineChart } from '@/features/analytics/components/conversations-per-day-line-chart'
import { CostOverTimeChart } from '@/features/dashboard/components/cost-over-time-chart'
import { EmptyState } from '@/features/dashboard/components/empty-state'
import type { UserActivityPayload } from '@/lib/dashboard/users'

export function UserActivityTab({
  activity,
}: {
  activity: UserActivityPayload
}) {
  const k = activity.kpis
  const successPct = Math.round(k.successRate * 1000) / 10

  return (
    <div className="flex flex-col gap-4">
      {/* 30-day KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard
          label="Conversations · 30d"
          value={k.conversations}
          format="number"
        />
        <KPICard label="Messages · 30d" value={k.messages} format="number" />
        <KPICard
          label="Cost · 30d"
          value={k.totalCost}
          format="currency_credits"
        />
        <KPICard
          label="Success rate · 30d"
          value={successPct}
          format="percent"
        />
      </div>

      {/* Daily charts side-by-side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ConversationsPerDayLineChart data={activity.conversationsPerDay} />
        <CostOverTimeChart
          data={activity.costPerDay.map((d) => ({
            date: d.date,
            cost: d.cost,
            // CostOverTimeChart expects a `conversations` field for its
            // tooltip rendering. We don't have a per-day count combined here
            // so fill with 0 to keep the type satisfied — the chart only
            // visualises `cost` anyway.
            conversations: 0,
          }))}
        />
      </div>

      {/* Recent conversations list */}
      <Card>
        <CardHeader>
          <CardTitle>Recent conversations</CardTitle>
          <CardDescription>
            Last 20 sessions for this user. Click any row to drill in.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {activity.recentConversations.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState
                title="No conversations yet"
                description="This user hasn't talked to Bathla COS in the selected window."
              />
            </div>
          ) : (
            <ul className="divide-border/40 divide-y">
              {activity.recentConversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/conversations/${c.id}`}
                    className="hover:bg-muted/40 flex items-center gap-3 px-6 py-3 transition-colors"
                    prefetch={false}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium leading-tight truncate">
                          {c.analysisTitle ?? 'Untitled'}
                        </span>
                        <OutcomeBadge status={c.callSuccessful} />
                      </div>
                      <div className="text-muted-foreground text-xs leading-tight tabular-nums">
                        {relativeTime(c.startedAt)} ·{' '}
                        {c.durationSecs != null
                          ? formatDurationSecs(c.durationSecs)
                          : '—'}{' '}
                        ·{' '}
                        {c.messageCount}{' '}
                        {c.messageCount === 1 ? 'message' : 'messages'}
                      </div>
                    </div>
                    <div className="text-right text-sm tabular-nums shrink-0">
                      {c.costCredits != null
                        ? `${c.costCredits.toLocaleString('en-IN')} credits`
                        : '—'}
                    </div>
                    <IconArrowRight className="text-muted-foreground size-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
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
          'gap-0.5 h-4 px-1 text-[9px]',
        )}
      >
        <IconCheck className="size-2.5" />
      </Badge>
    )
  }
  if (status === 'failure') {
    return (
      <Badge
        variant="outline"
        className="border-rose-500/30 text-rose-600 dark:text-rose-400 gap-0.5 h-4 px-1 text-[9px]"
      >
        <IconX className="size-2.5" />
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground gap-0.5 h-4 px-1 text-[9px]"
    >
      <IconHelp className="size-2.5" />
    </Badge>
  )
}
