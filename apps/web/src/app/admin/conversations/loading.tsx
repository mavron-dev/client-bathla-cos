import PageContainer from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ConversationsLoading() {
  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-6 pt-2 lg:px-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-[260px] rounded-md" />
          <Skeleton className="h-9 w-[150px] rounded-md" />
          <Skeleton className="h-9 w-[160px] rounded-md" />
          <Skeleton className="h-9 w-[160px] rounded-md" />
        </div>

        <Card>
          <CardContent className="space-y-3 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
