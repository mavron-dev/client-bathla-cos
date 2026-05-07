import PageContainer from '@/components/layout/page-container'
import { Skeleton } from '@/components/ui/skeleton'
import {
  KPICardSkeleton,
  CostChartSkeleton,
  RecentConversationsTableSkeleton,
} from '@/features/dashboard/components/dashboard-skeletons'

export default function AdminDashboardLoading() {
  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 pb-6 pt-2 lg:px-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          <div className="lg:col-span-7">
            <CostChartSkeleton />
          </div>
          <div className="lg:col-span-7">
            <RecentConversationsTableSkeleton />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
