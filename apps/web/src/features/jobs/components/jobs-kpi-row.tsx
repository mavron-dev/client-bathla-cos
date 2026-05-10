import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { JobStats } from '@/lib/dashboard/jobs'

export function JobsKpiRow({ stats }: { stats: JobStats }) {
  const successPct =
    stats.successRate24h == null ? null : Math.round(stats.successRate24h * 100)

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Pending"
        value={stats.pending.toLocaleString('en-IN')}
        sub="Awaiting worker pickup"
      />
      <StatCard
        label="Running"
        value={stats.running.toLocaleString('en-IN')}
        sub="In flight right now"
        valueTone={stats.running > 0 ? 'neutral' : 'muted'}
      />
      <StatCard
        label="Failed · 24h"
        value={stats.failed24h.toLocaleString('en-IN')}
        sub={`${stats.total24h.toLocaleString('en-IN')} jobs finished in last 24h`}
        valueTone={stats.failed24h > 0 ? 'bad' : 'muted'}
      />
      <StatCard
        label="Success rate · 24h"
        value={successPct == null ? '—' : `${successPct}%`}
        sub={
          successPct == null
            ? 'No finished jobs in the last 24h'
            : `${stats.succeeded24h.toLocaleString('en-IN')} of ${stats.total24h.toLocaleString('en-IN')} succeeded`
        }
        valueTone={
          successPct == null
            ? 'muted'
            : successPct >= 95
              ? 'good'
              : successPct >= 80
                ? 'neutral'
                : 'bad'
        }
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  valueTone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  valueTone?: 'neutral' | 'good' | 'bad' | 'muted'
}) {
  return (
    <Card className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            'text-2xl font-semibold tabular-nums',
            valueTone === 'good' && 'text-emerald-600 dark:text-emerald-400',
            valueTone === 'bad' && 'text-rose-600 dark:text-rose-400',
            valueTone === 'muted' && 'text-muted-foreground',
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {sub && (
        <CardContent className="text-muted-foreground text-xs">
          {sub}
        </CardContent>
      )}
    </Card>
  )
}
