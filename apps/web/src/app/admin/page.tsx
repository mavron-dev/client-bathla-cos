import PageContainer from '@/components/layout/page-container'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { auth } from '@/lib/auth'
import { getOverview } from '@/lib/dashboard/queries'
import { KPICard } from '@/features/dashboard/components/kpi-card'
import { CostOverTimeChart } from '@/features/dashboard/components/cost-over-time-chart'
import { RecentConversationsTable } from '@/features/dashboard/components/recent-conversations-table'
import { ActivityHeatmap } from '@/features/analytics/components/activity-heatmap'
import { EmptyState } from '@/features/dashboard/components/empty-state'

// Disable full-page caching — these are live dashboards and the underlying
// session/cost numbers should reflect the latest WhatsApp conversation
// without a hard refresh. 60s revalidate at the data-fetch boundary covers
// the cache layer; the page itself stays dynamic.
export const dynamic = 'force-dynamic'

export default async function AdminDashboardHome() {
  const session = await auth()
  const overview = await getOverview()

  const firstNameSource =
    session?.user?.name ||
    session?.user?.email?.split('@')[0] ||
    'there'
  const firstName = firstNameSource.split(/\s+/)[0]

  const { kpis, costOverTime, heatmap, recentConversations } = overview
  const heatmapTotal = heatmap.reduce((s, c) => s + c.count, 0)

  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 pb-6 pt-2 lg:px-6">
        {/* Greeting strip */}
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Good day, {firstName} 👋
          </h1>
          <p className="text-muted-foreground text-sm">
            {overview.greeting.today} ·{' '}
            <span className="tabular-nums">
              {kpis.conversationsLast7d.value.toLocaleString('en-IN')}
            </span>{' '}
            conversations this week
          </p>
        </div>

        {/* KPI row — 4 cards across desktop, 2x2 on smaller widths */}
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          <KPICard
            label="Conversations · 7d"
            value={kpis.conversationsLast7d.value}
            format="number"
            trend={kpis.conversationsLast7d.trend}
            trendIsGood="up"
            sparkline={kpis.sparklines.conversations}
            footnote="Across all channels"
            icon="messages"
          />
          <KPICard
            label="Spend · 7d"
            value={kpis.costLast7d.value}
            format="currency_credits"
            trend={kpis.costLast7d.trend}
            trendIsGood="down"
            sparkline={kpis.sparklines.cost}
            footnote="ElevenLabs credits"
            icon="coins"
          />
          <KPICard
            label="Active users · 7d"
            value={kpis.activeUsersLast7d.value}
            format="number"
            trend={kpis.activeUsersLast7d.trend}
            trendIsGood="up"
            sparkline={kpis.sparklines.activeUsers}
            footnote="Distinct WhatsApp users"
            icon="users"
          />
          <KPICard
            label="Success rate · 7d"
            value={kpis.successRateLast7d.value}
            format="percent"
            trend={kpis.successRateLast7d.trend}
            trendIsGood="up"
            sparkline={kpis.sparklines.successRate.map((r) =>
              Math.round(r * 100),
            )}
            footnote="Per agent self-evaluation"
            icon="circle-check"
          />
        </div>

        {/* Cost over time + activity heatmap + recent conversations stack */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-7">
            <CostOverTimeChart data={costOverTime} />
          </div>
          <div className="lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>Activity heatmap</CardTitle>
                <CardDescription>
                  Conversations by day-of-week × hour (IST). Last 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {heatmapTotal === 0 ? (
                  <EmptyState
                    title="No activity yet"
                    description="Heatmap lights up once conversations start landing."
                  />
                ) : (
                  <ActivityHeatmap data={heatmap} />
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-7">
            <RecentConversationsTable conversations={recentConversations} />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
