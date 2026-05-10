import PageContainer from '@/components/layout/page-container'
import { Skeleton } from '@/components/ui/skeleton'

export default function SummariesLoading() {
  return (
    <PageContainer scrollable>
      <div className="flex flex-1 flex-col gap-5 px-4 pb-6 pt-2 lg:px-6">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="ml-auto h-9 w-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
