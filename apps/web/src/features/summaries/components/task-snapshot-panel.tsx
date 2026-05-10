import { Card, CardContent } from '@/components/ui/card'
import type { TaskSnapshot } from '@/lib/dashboard/summaries'

const COLUMNS: Array<{
  key: keyof TaskSnapshot
  label: string
  tone: string
}> = [
  { key: 'in_progress', label: 'In progress', tone: 'text-sky-600 dark:text-sky-400' },
  { key: 'pending', label: 'Pending', tone: 'text-foreground' },
  { key: 'deferred', label: 'Deferred', tone: 'text-amber-600 dark:text-amber-400' },
]

export function TaskSnapshotPanel({ snapshot }: { snapshot: TaskSnapshot }) {
  const totalTasks =
    (snapshot.in_progress?.length ?? 0) +
    (snapshot.pending?.length ?? 0) +
    (snapshot.deferred?.length ?? 0)
  if (totalTasks === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        End-of-day snapshot
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = (snapshot[col.key] ?? []) as string[]
          return (
            <Card key={col.key} className="@container/snapshot">
              <CardContent className="space-y-2 px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <span className={`text-xs font-medium ${col.tone}`}>
                    {col.label}
                  </span>
                  <span className="text-muted-foreground tabular-nums text-[10px]">
                    {items.length}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="text-muted-foreground text-xs italic">—</p>
                ) : (
                  <ul className="space-y-1">
                    {items.map((title, i) => (
                      <li
                        key={i}
                        className="text-xs leading-tight"
                        lang="hi"
                      >
                        {title}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
