import Link from 'next/link'
import { IconRobot, IconArrowRight } from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ObservabilityHealth } from '@/lib/dashboard/observability'

export function HealthStrip({
  health,
}: {
  health: ObservabilityHealth
}) {
  const successPct = Math.round(health.successRate24h * 100)
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label="Webhooks · 24h"
        value={health.total24h.toLocaleString('en-IN')}
        sub={`${health.completed24h.toLocaleString('en-IN')} completed · ${health.failed24h.toLocaleString('en-IN')} failed`}
      />
      <StatCard
        label="Success rate · 24h"
        value={health.total24h > 0 ? `${successPct}%` : '—'}
        valueTone={
          health.total24h === 0
            ? 'muted'
            : successPct >= 95
              ? 'good'
              : successPct >= 80
                ? 'neutral'
                : 'bad'
        }
      />
      <StatCard
        label="Latency p50 / p95 / p99"
        value={
          health.p50 != null
            ? `${Math.round(health.p50)}ms`
            : '—'
        }
        sub={
          health.p95 != null && health.p99 != null
            ? `p95 ${Math.round(health.p95)}ms · p99 ${Math.round(health.p99)}ms`
            : 'No timing data yet'
        }
      />
      <Link href="/admin/jobs" className="block">
        <Card className="@container/card from-primary/5 to-card dark:bg-card hover:border-primary/40 bg-gradient-to-t shadow-xs transition">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <IconRobot className="size-3.5 opacity-60" />
              Jobs
              <IconArrowRight className="ml-auto size-3 opacity-40" />
            </CardDescription>
            <CardTitle
              className={cn(
                'text-2xl font-semibold tabular-nums',
                health.jobs.failed24h > 0 &&
                  'text-rose-600 dark:text-rose-400',
              )}
            >
              {health.jobs.pending.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-xs">
            {health.jobs.pending.toLocaleString('en-IN')} pending ·{' '}
            {health.jobs.failed24h.toLocaleString('en-IN')} failed (24h)
          </CardContent>
        </Card>
      </Link>
      <Card className="@container/card">
        <CardHeader className="pb-2">
          <CardDescription>WhatsApp number</CardDescription>
          <CardTitle className="flex items-center gap-2 text-lg">
            {health.whatsappQuality?.rating ? (
              <Badge
                variant="outline"
                className={cn(
                  'gap-1 font-medium',
                  qualityTone(health.whatsappQuality.rating),
                )}
              >
                {health.whatsappQuality.rating}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm font-normal">
                No quality data
              </span>
            )}
            {health.whatsappQuality?.status && (
              <span className="text-muted-foreground text-xs font-normal">
                {health.whatsappQuality.status}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          {health.whatsappQuality?.messagingLimit && (
            <div>Limit: {health.whatsappQuality.messagingLimit}</div>
          )}
          {health.whatsappQuality?.checkedAt && (
            <div>
              Last check:{' '}
              {new Date(health.whatsappQuality.checkedAt).toLocaleString(
                'en-IN',
                { timeZone: 'Asia/Kolkata' },
              )}
            </div>
          )}
        </CardContent>
      </Card>
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

function qualityTone(rating: string): string {
  switch (rating.toUpperCase()) {
    case 'GREEN':
      return 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
    case 'YELLOW':
      return 'border-amber-500/30 text-amber-600 dark:text-amber-400'
    case 'RED':
      return 'border-rose-500/30 text-rose-600 dark:text-rose-400'
    default:
      return 'text-muted-foreground'
  }
}
