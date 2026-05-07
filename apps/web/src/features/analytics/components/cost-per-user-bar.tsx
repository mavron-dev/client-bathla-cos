import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { EmptyState } from '@/features/dashboard/components/empty-state'

export interface CostPerUserRow {
  userId: string
  displayName: string
  image: string | null
  cost: number
}

export function CostPerUserBar({ data }: { data: CostPerUserRow[] }) {
  const max = data.reduce((m, r) => Math.max(m, r.cost), 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost per user</CardTitle>
        <CardDescription>
          Credits spent per active user, sorted desc.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            title="No user costs"
            description="No conversations attributed to users in this window."
          />
        ) : (
          <ul className="space-y-2.5">
            {data.map((r) => {
              const pct = max > 0 ? (r.cost / max) * 100 : 0
              const initials = r.displayName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('')
              return (
                <li key={r.userId} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar className="size-6">
                        {r.image && <AvatarImage src={r.image} alt="" />}
                        <AvatarFallback className="text-[10px]">
                          {initials || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium">
                        {r.displayName}
                      </span>
                    </div>
                    <span className="tabular-nums">
                      {r.cost.toLocaleString('en-IN')} credits
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
