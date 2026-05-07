import {
  getPerUserAnalytics,
  type AnalyticsRange,
} from '@/lib/dashboard/analytics'
import { PerUserTable } from './per-user-table'

export async function AnalyticsPerUserTab({
  range,
}: {
  range: AnalyticsRange
}) {
  const rows = await getPerUserAnalytics(range)
  return <PerUserTable rows={rows} />
}
