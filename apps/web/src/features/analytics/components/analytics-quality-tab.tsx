import {
  getQualityAnalytics,
  type AnalyticsRange,
} from '@/lib/dashboard/analytics'
import { HorizontalRateBarCard } from './horizontal-rate-bar-card'
import { SuccessRateLineChart } from './success-rate-line-chart'

export async function AnalyticsQualityTab({
  range,
}: {
  range: AnalyticsRange
}) {
  const data = await getQualityAnalytics(range)

  return (
    <div className="flex flex-col gap-4">
      <SuccessRateLineChart data={data.successRateOverTime} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <HorizontalRateBarCard
          title="Per-criterion pass rate"
          description="How often each evaluation criterion was rated success."
          tone="success"
          rows={data.criteriaPassRate.map((c) => ({
            id: c.criterionId,
            passed: c.passed,
            total: c.total,
            rate: c.passRate,
          }))}
          emptyTitle="No criteria data"
          emptyDescription="Conversations with analysis will populate this chart."
        />
        <HorizontalRateBarCard
          title="Data collection coverage"
          description="Share of conversations where each extraction field was populated. Low coverage often means a config issue."
          tone="neutral"
          rows={data.dataCollectionCoverage.map((c) => ({
            id: c.fieldId,
            passed: c.populated,
            total: c.total,
            rate: c.coverage,
          }))}
          emptyTitle="No data extraction yet"
          emptyDescription="Conversations with analysis will populate this chart."
        />
      </div>
    </div>
  )
}
