import {
  IconCheck,
  IconClock,
  IconLoader2,
  IconHelp,
  IconX,
} from '@tabler/icons-react'
import { JobStatus } from '@bathla-cos/database'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const TONE: Record<JobStatus, string> = {
  pending: 'border-sky-500/30 text-sky-600 dark:text-sky-400',
  running: 'border-amber-500/30 text-amber-600 dark:text-amber-400',
  success: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  failed: 'border-rose-500/30 text-rose-600 dark:text-rose-400',
  skipped: 'border-border text-muted-foreground',
}

const ICON: Record<JobStatus, typeof IconCheck> = {
  pending: IconClock,
  running: IconLoader2,
  success: IconCheck,
  failed: IconX,
  skipped: IconHelp,
}

export function JobStatusChip({
  status,
  className,
}: {
  status: JobStatus
  className?: string
}) {
  const Icon = ICON[status]
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 text-[10px]', TONE[status], className)}
    >
      <Icon
        className={cn('size-3', status === 'running' && 'animate-spin')}
      />
      {status}
    </Badge>
  )
}
