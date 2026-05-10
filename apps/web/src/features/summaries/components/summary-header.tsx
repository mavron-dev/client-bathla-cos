import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SummaryUserOption } from '@/lib/dashboard/summaries'

const TONE_TONE: Record<string, string> = {
  focused: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  energetic: 'border-amber-500/30 text-amber-600 dark:text-amber-400',
  calm: 'border-sky-500/30 text-sky-600 dark:text-sky-400',
  frustrated: 'border-rose-500/30 text-rose-600 dark:text-rose-400',
  distracted: 'border-violet-500/30 text-violet-600 dark:text-violet-400',
  overwhelmed: 'border-rose-600/40 text-rose-700 dark:text-rose-400',
  neutral: 'border-border text-muted-foreground',
}

export function SummaryHeader({
  date,
  user,
  emotionalTone,
  communicationPattern,
  messageCount,
}: {
  date: string
  user: SummaryUserOption | null
  emotionalTone: string | null
  communicationPattern: string | null
  messageCount: number | null
}) {
  const headline = formatHeadline(date)
  const tone = emotionalTone?.toLowerCase() ?? null
  const initials = user
    ? user.displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')
    : null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{headline}</h2>
        {user && (
          <span className="bg-muted/50 inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-xs">
            <Avatar className="size-5">
              {user.image && <AvatarImage src={user.image} alt="" />}
              <AvatarFallback className="text-[9px]">
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
            <span>{user.displayName}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {tone && (
          <Badge
            variant="outline"
            className={cn(
              'gap-1 capitalize',
              TONE_TONE[tone] ?? TONE_TONE.neutral,
            )}
          >
            {tone}
          </Badge>
        )}
        {communicationPattern && (
          <span className="text-muted-foreground text-xs">
            “{communicationPattern}”
          </span>
        )}
        {typeof messageCount === 'number' && messageCount > 0 && (
          <span className="text-muted-foreground text-xs tabular-nums">
            · {messageCount} messages
          </span>
        )}
      </div>
    </div>
  )
}

function formatHeadline(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
