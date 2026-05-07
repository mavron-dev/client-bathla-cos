'use client'

import * as React from 'react'
import Link from 'next/link'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/features/dashboard/lib/format'
import type { UserCardStats } from '@/lib/dashboard/users'

const ROLE_TONE: Record<string, string> = {
  admin: 'border-amber-500/30 text-amber-600 dark:text-amber-400',
  developer: 'border-violet-500/30 text-violet-600 dark:text-violet-400',
  director: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  manager: 'border-sky-500/30 text-sky-600 dark:text-sky-400',
  member: 'border-border text-muted-foreground',
}

export function UserCard({ user }: { user: UserCardStats }) {
  const initials = user.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const successPct = Math.round(user.successRate30d * 100)

  return (
    <Link
      href={`/admin/users/${user.id}`}
      className="group block focus-visible:outline-none"
      prefetch={false}
    >
      <Card
        className={cn(
          'h-full transition-all',
          'group-hover:border-foreground/20 group-hover:shadow-md',
          !user.isActive && 'opacity-60',
        )}
      >
        <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
          <Avatar className="size-12">
            {user.image && <AvatarImage src={user.image} alt="" />}
            <AvatarFallback className="text-sm">
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm leading-tight truncate">
                {user.displayName}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'h-4 px-1 text-[9px] font-normal',
                  ROLE_TONE[user.role] ?? 'text-muted-foreground',
                )}
              >
                {user.role}
              </Badge>
              {!user.isActive && (
                <Badge
                  variant="outline"
                  className="h-4 px-1 text-[9px] font-normal text-muted-foreground"
                >
                  inactive
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground text-xs leading-tight tabular-nums">
              {user.phoneE164}
            </div>
            <div className="text-muted-foreground text-xs leading-tight">
              {user.lastActive
                ? `Last active ${relativeTime(user.lastActive)}`
                : 'No conversations yet'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Sparkline */}
          <div className="h-10 w-full">
            <Sparkline values={user.sparkline14d} />
          </div>

          {/* 3-stat row */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat
              label="Convos"
              value={user.conversations30d.toLocaleString('en-IN')}
            />
            <Stat
              label="Cost"
              value={
                user.totalCost30d > 0
                  ? `${formatCompact(user.totalCost30d)}`
                  : '—'
              }
              suffix={user.totalCost30d > 0 ? 'cr' : undefined}
            />
            <Stat
              label="Success"
              value={user.conversations30d > 0 ? `${successPct}%` : '—'}
              tone={
                user.conversations30d === 0
                  ? 'muted'
                  : successPct >= 80
                    ? 'good'
                    : successPct >= 50
                      ? 'neutral'
                      : 'bad'
              }
            />
          </div>
          <div className="text-muted-foreground text-[10px] leading-tight pt-1">
            Last 30 days · sparkline last 14 days
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function Stat({
  label,
  value,
  suffix,
  tone = 'neutral',
}: {
  label: string
  value: string
  suffix?: string
  tone?: 'neutral' | 'good' | 'bad' | 'muted'
}) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          'tabular-nums text-sm font-medium',
          tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'bad' && 'text-rose-600 dark:text-rose-400',
          tone === 'muted' && 'text-muted-foreground',
        )}
      >
        {value}
        {suffix && (
          <span className="text-muted-foreground font-normal ml-0.5 text-[10px]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function Sparkline({ values }: { values: number[] }) {
  const series = values.map((v, i) => ({ i, v }))
  const max = values.reduce((m, v) => Math.max(m, v), 0)
  const allZero = max === 0
  const id = React.useId().replace(/:/g, '')
  const fillId = `user-spark-${id}`

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={series}
        margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={allZero ? 'var(--border)' : 'var(--primary)'}
          strokeWidth={1.5}
          fill={allZero ? 'transparent' : `url(#${fillId})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString('en-IN')
}
