import PageContainer from '@/components/layout/page-container'
import { requireAdminOrDev } from '@/lib/requireAuth'
import {
  findMostRecentSummaryDate,
  getDailySummary,
  getUserTimezone,
  listAccessibleSummaryUsers,
  listSummaryDates,
} from '@/lib/dashboard/summaries'
import { SummaryModeToggle } from '@/features/summaries/components/summary-mode-toggle'
import { SummaryUserPicker } from '@/features/summaries/components/summary-user-picker'
import { SummaryRefreshButton } from '@/features/summaries/components/summary-refresh-button'
import { SummaryDateRail } from '@/features/summaries/components/summary-date-rail'
import { SummaryHeader } from '@/features/summaries/components/summary-header'
import { SummaryBodyCard } from '@/features/summaries/components/summary-body-card'
import { KeyDecisionList } from '@/features/summaries/components/key-decision-list'
import { TaskSnapshotPanel } from '@/features/summaries/components/task-snapshot-panel'
import { SummaryEmptyState } from '@/features/summaries/components/summary-empty-state'

export const metadata = {
  title: 'Summaries · Admin · Bathla COS',
}
export const dynamic = 'force-dynamic'

type SearchParams = {
  userId?: string
  date?: string
  mode?: string
}

export default async function SummariesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await requireAdminOrDev()
  const params = await searchParams

  const callerId = session.user!.id!
  const mode: 'daily' | 'weekly' = params.mode === 'weekly' ? 'weekly' : 'daily'

  // Always fetch the user list — page is admin/dev gated, so the picker is
  // always rendered.
  const accessibleUsersPromise = listAccessibleSummaryUsers()

  // Default to the alphabetically-first active user (matches the picker's
  // sort) so admins land on real data instead of their own empty page.
  const userId =
    params.userId ?? (await accessibleUsersPromise)[0]?.id ?? callerId

  // Need the user's TZ before kicking off the date queries because the
  // 30-day window is computed in their local time.
  const tz = await getUserTimezone(userId)

  const dateParam =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : null

  // Default landing date: most recent summary; fall back to today in user TZ
  // (so the empty state can prompt them).
  let resolvedDate = dateParam
  if (!resolvedDate) {
    resolvedDate =
      (await findMostRecentSummaryDate(userId, tz)) ?? (await todayInTz(tz))
  }

  if (mode === 'weekly') {
    const accessibleUsers = await accessibleUsersPromise
    return (
      <PageContainer scrollable>
        <Shell
          mode={mode}
          userId={userId}
          accessibleUsers={accessibleUsers}
        >
          <SummaryEmptyState
            date={resolvedDate}
            isToday={false}
            isWeekly
          />
        </Shell>
      </PageContainer>
    )
  }

  const [dates, summary, accessibleUsers] = await Promise.all([
    listSummaryDates({ userId, days: 30, tz }),
    getDailySummary({ userId, date: resolvedDate }),
    accessibleUsersPromise,
  ])

  const todayStr = await todayInTz(tz)
  const isToday = resolvedDate === todayStr
  const mostRecent = dates.find((d) => d.hasSummary)
  const fallbackHref =
    mostRecent && mostRecent.date !== resolvedDate
      ? buildSummaryHref(userId, mostRecent.date)
      : null

  const selectedUser =
    accessibleUsers.find((u) => u.id === userId) ?? null

  return (
    <PageContainer scrollable>
      <Shell mode={mode} userId={userId} accessibleUsers={accessibleUsers}>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <SummaryDateRail items={dates} selectedDate={resolvedDate} />

          <div className="space-y-5">
            {summary ? (
              <>
                <SummaryHeader
                  date={resolvedDate}
                  user={selectedUser}
                  emotionalTone={summary.emotionalTone}
                  communicationPattern={summary.communicationPattern}
                  messageCount={summary.messageCount}
                />
                <SummaryBodyCard summaryText={summary.summaryText} />
                <KeyDecisionList decisions={summary.keyDecisions} />
                <TaskSnapshotPanel snapshot={summary.taskStateSnapshot} />
              </>
            ) : (
              <SummaryEmptyState
                date={resolvedDate}
                isToday={isToday}
                fallbackHref={fallbackHref ?? undefined}
                fallbackLabel={
                  fallbackHref ? `View ${formatShortDate(mostRecent!.date)}` : undefined
                }
              />
            )}
          </div>
        </div>
      </Shell>
    </PageContainer>
  )
}

function Shell({
  mode,
  userId,
  accessibleUsers,
  children,
}: {
  mode: 'daily' | 'weekly'
  userId: string
  accessibleUsers: { id: string; displayName: string; image: string | null; timezone: string }[]
  children: React.ReactNode
}) {
  return (
    <div className="@container/main flex flex-1 flex-col gap-5 px-4 pb-6 pt-2 lg:px-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Summaries</h1>
        <p className="text-muted-foreground text-sm">
          What Butler remembers about each user’s day. Admin / developer only.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SummaryModeToggle mode={mode} />
        <SummaryUserPicker users={accessibleUsers} selectedId={userId} />
        <div className="ml-auto">
          <SummaryRefreshButton />
        </div>
      </div>

      {children}
    </div>
  )
}

async function todayInTz(tz: string): Promise<string> {
  // Single-purpose helper. Mirrors the SQL in the service so the page can
  // compute "today in user TZ" without re-querying.
  // (Lightweight Intl-based approach — avoids another DB round-trip just to
  // format today's date.)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

function formatShortDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}

function buildSummaryHref(userId: string, date: string): string {
  const sp = new URLSearchParams({ userId, date })
  return `/admin/summaries?${sp.toString()}`
}
