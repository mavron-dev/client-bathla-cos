import PageContainer from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { requireAdminOrDev } from '@/lib/requireAuth'
import {
  getObservabilityHealth,
  listWebhookAudit,
} from '@/lib/dashboard/observability'
import { HealthStrip } from '@/features/observability/components/health-strip'
import { AuditLogFilterBar } from '@/features/observability/components/audit-log-filter-bar'
import { AuditLogTable } from '@/features/observability/components/audit-log-table'
import { AuditLogPagination } from '@/features/observability/components/audit-log-pagination'

export const metadata = {
  title: 'Observability · Admin · Bathla COS',
}
export const dynamic = 'force-dynamic'

type SearchParams = {
  source?: string
  eventType?: string
  status?: string
  signatureValid?: string
  userId?: string
  page?: string
}

export default async function ObservabilityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminOrDev()
  const params = await searchParams

  const [health, audit] = await Promise.all([
    getObservabilityHealth(),
    listWebhookAudit({
      source: params.source,
      eventType: params.eventType,
      status: params.status,
      signatureValid: params.signatureValid,
      userId: params.userId,
      page: params.page,
    }),
  ])

  // Build a base URLSearchParams (sans `page`) for the pagination links.
  const base = new URLSearchParams()
  if (params.source) base.set('source', params.source)
  if (params.eventType) base.set('eventType', params.eventType)
  if (params.status) base.set('status', params.status)
  if (params.signatureValid)
    base.set('signatureValid', params.signatureValid)
  if (params.userId) base.set('userId', params.userId)

  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-6 pt-2 lg:px-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Observability
          </h1>
          <p className="text-muted-foreground text-sm">
            Webhook delivery health + raw audit log. Admin / developer only.
          </p>
        </div>

        <HealthStrip health={health} />

        <div className="space-y-4">
          <AuditLogFilterBar />
          <Card>
            <CardContent className="p-0">
              <AuditLogTable rows={audit.data} />
            </CardContent>
          </Card>
          {audit.total > 0 && (
            <AuditLogPagination
              page={audit.page}
              limit={audit.limit}
              total={audit.total}
              baseSearchParams={base}
            />
          )}
        </div>
      </div>
    </PageContainer>
  )
}
