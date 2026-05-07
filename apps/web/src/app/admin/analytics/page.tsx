import PageContainer from '@/components/layout/page-container'
import { rangeFromPreset } from '@/lib/dashboard/analytics'
import {
  AnalyticsControls,
  type AnalyticsTab,
  type AnalyticsRangePreset,
} from '@/features/analytics/components/analytics-controls'
import { AnalyticsOverviewTab } from '@/features/analytics/components/analytics-overview-tab'
import { AnalyticsCostTab } from '@/features/analytics/components/analytics-cost-tab'
import { AnalyticsQualityTab } from '@/features/analytics/components/analytics-quality-tab'
import { AnalyticsEngagementTab } from '@/features/analytics/components/analytics-engagement-tab'
import { AnalyticsPerUserTab } from '@/features/analytics/components/analytics-per-user-tab'

export const dynamic = 'force-dynamic'

const VALID_TABS: AnalyticsTab[] = [
  'overview',
  'cost',
  'quality',
  'engagement',
  'users',
]
const VALID_RANGES: AnalyticsRangePreset[] = ['7d', '30d', '90d']

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; range?: string }>
}) {
  const sp = await searchParams
  const tab: AnalyticsTab = (VALID_TABS as string[]).includes(sp.tab ?? '')
    ? (sp.tab as AnalyticsTab)
    : 'overview'
  const rangePreset: AnalyticsRangePreset = (
    VALID_RANGES as string[]
  ).includes(sp.range ?? '')
    ? (sp.range as AnalyticsRangePreset)
    : '30d'

  const range = rangeFromPreset(rangePreset)

  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-6 pt-2 lg:px-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Cost, quality, and engagement signals across every conversation.
          </p>
        </div>

        <AnalyticsControls
          currentTab={tab}
          currentRange={rangePreset}
        />

        <div>
          {tab === 'overview' && <AnalyticsOverviewTab range={range} />}
          {tab === 'cost' && <AnalyticsCostTab range={range} />}
          {tab === 'quality' && <AnalyticsQualityTab range={range} />}
          {tab === 'engagement' && <AnalyticsEngagementTab range={range} />}
          {tab === 'users' && <AnalyticsPerUserTab range={range} />}
        </div>
      </div>
    </PageContainer>
  )
}
