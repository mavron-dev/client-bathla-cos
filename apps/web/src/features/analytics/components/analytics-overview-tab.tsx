import {
  getOverviewAnalytics,
  type AnalyticsRange,
} from '@/lib/dashboard/analytics'
import { KPICard } from '@/features/dashboard/components/kpi-card'
import { ConversationsVsCostChart } from './conversations-vs-cost-chart'
import { LanguageMixDonut } from './language-mix-donut'
import { TopUsersBar } from './top-users-bar'
import { formatDurationSecs } from '@/features/dashboard/lib/format'

export async function AnalyticsOverviewTab({
  range,
}: {
  range: AnalyticsRange
}) {
  const data = await getOverviewAnalytics(range)
  const k = data.kpis

  return (
    <div className="flex flex-col gap-4">
      {/* 6 KPIs in a 2x3 / 3x2 grid */}
      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        <KPICard
          label="Conversations"
          value={k.totalConversations}
          format="number"
          footnote="Total in the selected range"
        />
        <KPICard
          label="Total cost"
          value={k.totalCost}
          format="currency_credits"
          footnote="ElevenLabs credits"
        />
        <KPICard
          label="Total messages"
          value={k.totalMessages}
          format="number"
          footnote="Across every session"
        />
        <KPICard
          label="Avg duration"
          value={Math.round(k.avgDurationSecs)}
          format="number"
          footnote={
            k.avgDurationSecs > 0
              ? `≈ ${formatDurationSecs(k.avgDurationSecs)} per session`
              : 'No completed sessions'
          }
        />
        <KPICard
          label="Success rate"
          value={Math.round(k.successRate * 1000) / 10}
          format="percent"
          footnote="Per agent self-evaluation"
        />
        <KPICard
          label="Avg cost / session"
          value={k.avgCostPerConversation}
          format="currency_credits"
          footnote="Mean credits per conversation"
        />
      </div>

      <ConversationsVsCostChart data={data.conversationsVsCost} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopUsersBar data={data.topUsers} />
        <LanguageMixDonut data={data.languageMix} />
      </div>
    </div>
  )
}
