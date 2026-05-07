import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getEngagementAnalytics,
  type AnalyticsRange,
} from '@/lib/dashboard/analytics'
import { ActivityHeatmap } from './activity-heatmap'
import { ConversationsPerDayLineChart } from './conversations-per-day-line-chart'
import { DayOfWeekBarChart } from './day-of-week-bar-chart'
import { DurationHistogram } from './duration-histogram'
import { EmptyState } from '@/features/dashboard/components/empty-state'

export async function AnalyticsEngagementTab({
  range,
}: {
  range: AnalyticsRange
}) {
  const data = await getEngagementAnalytics(range)
  const heatmapTotal = data.heatmap.reduce((s, c) => s + c.count, 0)

  return (
    <div className="flex flex-col gap-4">
      {/* Hero: when does the team actually use Bathla COS? */}
      <Card>
        <CardHeader>
          <CardTitle>Activity heatmap</CardTitle>
          <CardDescription>
            Conversation count by day-of-week × hour-of-day (IST).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {heatmapTotal === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Heatmap lights up once conversations start landing."
            />
          ) : (
            <ActivityHeatmap data={data.heatmap} />
          )}
        </CardContent>
      </Card>

      <ConversationsPerDayLineChart data={data.conversationsPerDay} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DayOfWeekBarChart data={data.dayOfWeekPattern} />
        <DurationHistogram data={data.durationHistogram} />
      </div>
    </div>
  )
}
