import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/features/dashboard/components/empty-state'
import type { CostByModelEntry } from './cost-by-model-donut'

export function TokenUsageTable({ data }: { data: CostByModelEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Token usage</CardTitle>
        <CardDescription>
          Per-model token + USD breakdown across all conversations in the
          range.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {data.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              title="No token usage"
              description="No LLM charges recorded for this window."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Input</TableHead>
                  <TableHead className="text-right">Output</TableHead>
                  <TableHead className="text-right">Cache read</TableHead>
                  <TableHead className="text-right">Cache write</TableHead>
                  <TableHead className="text-right">Total $</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.model}>
                    <TableCell className="font-mono text-xs">
                      {row.model}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.inputTokens.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.outputTokens.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.cacheReadTokens.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.cacheWriteTokens.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatUsd(row.cost)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function formatUsd(usd: number): string {
  if (usd === 0) return '$0'
  if (usd < 0.001) return '<$0.001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}
