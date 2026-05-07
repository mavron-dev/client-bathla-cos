'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  IconClipboardList,
  IconCheck,
  IconAlertTriangle,
  IconMessage,
} from '@tabler/icons-react'
import type { UserProfilePayload } from '../types'

interface KpiTileProps {
  label: string
  value: number | string
  icon: React.ReactNode
  hint?: string
  tone?: 'default' | 'danger'
}

function KpiTile({ label, value, icon, hint, tone = 'default' }: KpiTileProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={
            tone === 'danger' ? 'text-red-500' : 'text-muted-foreground'
          }
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${
            tone === 'danger' ? 'text-red-600 dark:text-red-400' : ''
          }`}
        >
          {value}
        </div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

interface UserProfileKpisProps {
  kpis: UserProfilePayload['kpis']
}

export function UserProfileKpis({ kpis }: UserProfileKpisProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        label="Active tasks"
        value={kpis.activeTasks}
        icon={<IconClipboardList className="h-4 w-4" />}
        hint="Pending, in progress, or deferred"
      />
      <KpiTile
        label="Completed"
        value={kpis.completedTasks}
        icon={<IconCheck className="h-4 w-4" />}
        hint="Tasks marked done"
      />
      <KpiTile
        label="Overdue"
        value={kpis.overdueTasks}
        icon={<IconAlertTriangle className="h-4 w-4" />}
        hint="Past deadline, not yet done"
        tone={kpis.overdueTasks > 0 ? 'danger' : 'default'}
      />
      <KpiTile
        label="Conversations"
        value={kpis.sessions}
        icon={<IconMessage className="h-4 w-4" />}
        hint="WhatsApp / dashboard sessions"
      />
    </div>
  )
}
