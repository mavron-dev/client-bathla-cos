import {
  IconPlus,
  IconCheck,
  IconArrowForward,
  IconBolt,
  IconMessage,
  IconCircle,
} from '@tabler/icons-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { KeyDecisionItem } from '@/lib/dashboard/summaries'

type IconRender = {
  Icon: typeof IconCheck
  ring: string
  label: string
}

function iconForKind(kind: string | null | undefined): IconRender {
  switch ((kind ?? '').toLowerCase()) {
    case 'task_created':
      return {
        Icon: IconPlus,
        ring: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        label: 'Created',
      }
    case 'task_completed':
      return {
        Icon: IconCheck,
        ring: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        label: 'Completed',
      }
    case 'task_deferred':
      return {
        Icon: IconArrowForward,
        ring: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        label: 'Deferred',
      }
    case 'decision_made':
      return {
        Icon: IconBolt,
        ring: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        label: 'Decision',
      }
    case 'context_shared':
      return {
        Icon: IconMessage,
        ring: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
        label: 'Context',
      }
    default:
      return {
        Icon: IconCircle,
        ring: 'bg-muted text-muted-foreground',
        label: kind ?? '—',
      }
  }
}

export function KeyDecisionList({
  decisions,
}: {
  decisions: KeyDecisionItem[]
}) {
  if (decisions.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        Key decisions ({decisions.length})
      </h3>
      <Card>
        <CardContent className="space-y-1 px-3 py-2">
          {decisions.map((d, i) => {
            const { Icon, ring, label } = iconForKind(d.kind)
            const text = d.description ?? d.text ?? null
            return (
              <div
                key={i}
                className="hover:bg-muted/40 -mx-1 flex items-start gap-3 rounded-md px-1.5 py-1.5"
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full',
                    ring,
                  )}
                  aria-label={label}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
                      {label}
                    </span>
                    {d.taskTitle && (
                      <span className="font-medium leading-tight">
                        {d.taskTitle}
                      </span>
                    )}
                  </div>
                  {text && (
                    <p
                      lang="hi"
                      className="text-muted-foreground text-xs leading-relaxed"
                    >
                      {text}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
