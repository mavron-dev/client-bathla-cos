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

interface DataCollectionShape {
  data_collection_id?: string
  value?: unknown
  rationale?: string
  json_schema?: unknown
  [k: string]: unknown
}

export function DataCollectionCard({ results }: { results: unknown }) {
  const items = normalize(results)
  if (items.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Data extracted</CardTitle>
        <CardDescription>
          Fields the agent attempted to extract from this conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <TooltipProvider delayDuration={200}>
          {items.map((item, i) => (
            <DataRow key={item.data_collection_id ?? i} item={item} />
          ))}
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

function DataRow({ item }: { item: DataCollectionShape }) {
  const isNullish =
    item.value === null || item.value === undefined || item.value === ''
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'hover:bg-muted/40 flex items-baseline justify-between gap-2 rounded-md px-1.5 py-1 text-left',
            item.rationale && 'cursor-help',
          )}
        >
          <span className="font-mono text-xs">
            {item.data_collection_id ?? '—'}
          </span>
          <span
            className={cn(
              'tabular-nums text-xs',
              isNullish && 'text-muted-foreground italic',
            )}
          >
            {isNullish ? 'null' : displayValue(item.value)}
          </span>
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

function displayValue(v: unknown): string {
  if (typeof v === 'string') return `"${v}"`
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return JSON.stringify(v)
}

function normalize(raw: unknown): DataCollectionShape[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as DataCollectionShape[]
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, DataCollectionShape>).map(
      ([key, value]) => ({
        data_collection_id: value.data_collection_id ?? key,
        value: value.value,
        rationale: value.rationale,
        json_schema: value.json_schema,
      }),
    )
  }
  return []
}
