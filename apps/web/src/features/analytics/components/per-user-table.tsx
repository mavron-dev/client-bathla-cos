'use client'

import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/features/dashboard/components/empty-state'
import { relativeTime } from '@/features/dashboard/lib/format'
import type { PerUserRow } from '@/lib/dashboard/analytics'

export function PerUserTable({ rows }: { rows: PerUserRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Per-user activity</CardTitle>
        <CardDescription>
          Each active user&apos;s conversation count, total / average cost, and
          last seen — within the selected range.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              title="No users to show"
              description="No active users have conversations in this window."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Conversations</TableHead>
                  <TableHead className="text-right">Total cost</TableHead>
                  <TableHead className="text-right">Avg cost</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead>Last active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <Row key={r.userId} row={r} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ row }: { row: PerUserRow }) {
  const router = useRouter()
  const initials = row.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  return (
    <TableRow
      className="hover:bg-muted/40 cursor-pointer"
      onClick={() => router.push(`/admin/users/${row.userId}`)}
    >
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            {row.image && <AvatarImage src={row.image} alt="" />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">
              {row.displayName}
            </span>
            <div className="flex items-center gap-1.5 text-xs leading-tight">
              <span className="text-muted-foreground">{row.phoneE164}</span>
              <Badge variant="outline" className="h-4 px-1 text-[9px]">
                {row.role}
              </Badge>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.conversations.toLocaleString('en-IN')}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.totalCost > 0
          ? `${row.totalCost.toLocaleString('en-IN')} credits`
          : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.avgCost > 0
          ? `${row.avgCost.toLocaleString('en-IN')} credits`
          : '—'}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {row.conversations > 0
          ? `${Math.round(row.successRate * 100)}%`
          : '—'}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {row.lastActive ? relativeTime(row.lastActive) : 'Never'}
      </TableCell>
    </TableRow>
  )
}
