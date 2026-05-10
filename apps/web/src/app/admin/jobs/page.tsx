import { Card, CardContent } from '@/components/ui/card'
import PageContainer from '@/components/layout/page-container'
import { requireAdminOrDev } from '@/lib/requireAuth'
import {
  getJobStats,
  listJobs,
  listUsersWithJobs,
} from '@/lib/dashboard/jobs'
import { JobsKpiRow } from '@/features/jobs/components/jobs-kpi-row'
import { JobsFilterBar } from '@/features/jobs/components/jobs-filter-bar'
import { JobsTable } from '@/features/jobs/components/jobs-table'
import { JobsPagination } from '@/features/jobs/components/jobs-pagination'
import { JobDetailDrawer } from '@/features/jobs/components/job-detail-drawer'
import { JobsRefreshButton } from '@/features/jobs/components/jobs-refresh-button'

export const metadata = {
  title: 'Jobs · Admin · Bathla COS',
}
export const dynamic = 'force-dynamic'

type SearchParams = {
  type?: string | string[]
  status?: string | string[]
  userId?: string
  range?: string
  search?: string
  page?: string
  selected?: string
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminOrDev()
  const params = await searchParams

  // Translate the `range` preset into concrete from/to dates that the service
  // schema accepts. Keep `range` in the URL — the filter bar reads it back.
  const range = rangeToDates(params.range)

  const [stats, jobs, users] = await Promise.all([
    getJobStats(),
    listJobs({
      type: params.type,
      status: params.status,
      userId: params.userId,
      from: range.from,
      to: range.to,
      search: params.search,
      page: params.page,
    }),
    listUsersWithJobs(),
  ])

  // Build a base URLSearchParams (sans `page`) for pagination links. Keep
  // `selected` so the drawer survives a page change.
  const base = new URLSearchParams()
  appendArray(base, 'type', params.type)
  appendArray(base, 'status', params.status)
  if (params.userId) base.set('userId', params.userId)
  if (params.range) base.set('range', params.range)
  if (params.search) base.set('search', params.search)
  if (params.selected) base.set('selected', params.selected)

  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-6 pt-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
            <p className="text-muted-foreground text-sm">
              Scheduled and queued work across users. Admin / developer only.
            </p>
          </div>
          <JobsRefreshButton />
        </div>

        <JobsKpiRow stats={stats} />

        <div className="space-y-4">
          <JobsFilterBar users={users} />
          <Card>
            <CardContent className="p-0">
              <JobsTable rows={jobs.data} />
            </CardContent>
          </Card>
          {jobs.total > 0 && (
            <JobsPagination
              page={jobs.page}
              limit={jobs.limit}
              total={jobs.total}
              baseSearchParams={base}
            />
          )}
        </div>

        <JobDetailDrawer />
      </div>
    </PageContainer>
  )
}

function rangeToDates(range: string | undefined): {
  from?: Date
  to?: Date
} {
  if (!range || range === 'all') return {}
  const now = new Date()
  switch (range) {
    case 'today': {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return { from: start }
    }
    case 'yesterday': {
      const start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      return { from: start, to: end }
    }
    case '7d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return { from: start }
    }
    case '30d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return { from: start }
    }
    default:
      return {}
  }
}

function appendArray(
  sp: URLSearchParams,
  key: string,
  value: string | string[] | undefined,
) {
  if (!value) return
  const values = Array.isArray(value) ? value : [value]
  for (const v of values) if (v) sp.append(key, v)
}
