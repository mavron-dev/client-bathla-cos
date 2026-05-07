import {
  getCostAnalytics,
  type AnalyticsRange,
} from '@/lib/dashboard/analytics'
import { CacheHitRateChart } from './cache-hit-rate-chart'
import { CostStackedAreaChart } from './cost-stacked-area-chart'
import { CostByModelDonut } from './cost-by-model-donut'
import { TokenUsageTable } from './token-usage-table'
import { CostPerUserBar } from './cost-per-user-bar'

export async function AnalyticsCostTab({
  range,
}: {
  range: AnalyticsRange
}) {
  const data = await getCostAnalytics(range)

  return (
    <div className="flex flex-col gap-4">
      {/* Hero: cache hit rate trend */}
      <CacheHitRateChart data={data.cacheHitRateOverTime} />

      {/* Stacked daily cost split */}
      <CostStackedAreaChart data={data.costStackedByDay} />

      {/* Side by side: model breakdown + per-user */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CostByModelDonut data={data.costByModel} />
        <CostPerUserBar data={data.costPerUser} />
      </div>

      {/* Token table */}
      <TokenUsageTable data={data.costByModel} />
    </div>
  )
}
