import {
  IconCheck,
  IconX,
  IconHelp,
} from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CriterionShape {
  criteria_id?: string
  result?: string
  rationale?: string
  [k: string]: unknown
}

export function EvaluationCriteriaCard({
  results,
}: {
  results: unknown
}) {
  const items = normalize(results)
  if (items.length === 0) return null

  // Failed first, then unknown, then success — so problems read at the top.
  const sorted = [...items].sort((a, b) => order(a.result) - order(b.result))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evaluation criteria</CardTitle>
        <CardDescription>
          {items.filter((i) => i.result === 'success').length} of{' '}
          {items.length} criteria passed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <TooltipProvider delayDuration={200}>
          {sorted.map((item, i) => (
            <CriterionRow key={item.criteria_id ?? i} item={item} />
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

function CriterionRow({ item }: { item: CriterionShape }) {
  const Icon =
    item.result === 'success'
      ? IconCheck
      : item.result === 'failure'
        ? IconX
        : IconHelp
  const tone =
    item.result === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : item.result === 'failure'
        ? 'text-rose-600 dark:text-rose-400'
        : 'text-muted-foreground'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'hover:bg-muted/40 flex items-start gap-2 rounded-md px-1.5 py-1 text-left',
            item.rationale && 'cursor-help',
          )}
        >
          <Icon className={cn('mt-0.5 size-3.5 shrink-0', tone)} />
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs font-medium">
              {item.criteria_id ?? 'unnamed'}
            </div>
            {item.rationale && (
              <div className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                {item.rationale}
              </div>
            )}
          </div>
        </div>
      </TooltipTrigger>
      {item.rationale && (
        <TooltipContent side="left" className="max-w-sm text-xs">
          {item.rationale}
        </TooltipContent>
      )}
    </Tooltip>
  )
}

function normalize(raw: unknown): CriterionShape[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as CriterionShape[]
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, CriterionShape>).map(
      ([key, value]) => ({
        criteria_id: value.criteria_id ?? key,
        result: value.result,
        rationale: value.rationale,
      }),
    )
  }
  return []
}

function order(result: string | undefined): number {
  if (result === 'failure') return 0
  if (result === 'unknown') return 1
  if (result === 'success') return 2
  return 3
}
