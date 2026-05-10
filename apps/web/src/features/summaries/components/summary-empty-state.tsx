import Link from 'next/link'
import { IconCalendarOff } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export function SummaryEmptyState({
  date,
  isToday,
  fallbackHref,
  fallbackLabel,
  isWeekly = false,
}: {
  date: string
  isToday: boolean
  fallbackHref?: string
  fallbackLabel?: string
  isWeekly?: boolean
}) {
  if (isWeekly) {
    return (
      <Container>
        <CalendarIcon />
        <Title>Weekly summaries are coming next sprint.</Title>
        <Description>
          They’ll show themes, time-on-task patterns, and emotional trend
          across the week. Phase 2 work — not in this build.
        </Description>
      </Container>
    )
  }

  if (isToday) {
    return (
      <Container>
        <CalendarIcon />
        <Title>Today’s summary will be generated overnight.</Title>
        <Description>
          The daily summarization job runs after the user’s local midnight.
          Check back tomorrow morning.
        </Description>
        {fallbackHref && fallbackLabel && (
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href={fallbackHref}>{fallbackLabel}</Link>
          </Button>
        )}
      </Container>
    )
  }

  return (
    <Container>
      <CalendarIcon />
      <Title>No summary for {formatHeadline(date)}.</Title>
      <Description>
        Summaries are generated overnight — days without one usually mean the
        user didn’t talk to Butler that day, or the job hasn’t run yet.
      </Description>
    </Container>
  )
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {children}
    </div>
  )
}

function CalendarIcon() {
  return (
    <div className="bg-muted/50 text-muted-foreground rounded-full p-3">
      <IconCalendarOff className="size-5" />
    </div>
  )
}

function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-medium">{children}</h3>
}

function Description({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground max-w-md text-sm">{children}</p>
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
