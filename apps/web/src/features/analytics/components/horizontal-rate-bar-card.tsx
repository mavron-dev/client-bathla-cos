import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/features/dashboard/components/empty-state'

export interface RateBarRow {
  id: string
  passed: number
  total: number
  rate: number // 0..1
}

/**
 * Generic horizontal rate-bar card. Used for both the per-criterion pass
 * rate (Quality) and data collection coverage. The "tone" prop colours the
 * fill — 'success' green for criteria, 'neutral' for coverage so it doesn't
 * imply pass/fail (a 0% coverage might be a config issue, not a failure).
 */
export function HorizontalRateBarCard({
  title,
  description,
  rows,
  tone = 'success',
  emptyTitle,
  emptyDescription,
}: {
  title: string
  description: string
  rows: RateBarRow[]
  tone?: 'success' | 'neutral'
  emptyTitle: string
  emptyDescription: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-mono text-xs">{r.id}</span>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {r.passed}/{r.total} ·{' '}
                    <span className="text-foreground font-medium">
                      {Math.round(r.rate * 100)}%
                    </span>
                  </span>
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      tone === 'success'
                        ? 'bg-emerald-500'
                        : 'bg-primary',
                    )}
                    style={{ width: `${Math.round(r.rate * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
