import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeletons match exact dimensions of the loaded version so there's no
 * layout shift when data lands. Each one is the boring twin of a real
 * dashboard component.
 */

export function KPICardSkeleton() {
  return (
    <Card className="@container/card from-primary/5 to-card dark:bg-card bg-gradient-to-t shadow-xs">
      <CardHeader>
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="mt-1 h-8 w-32" />
        <div className="mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <div className="-mt-2 h-12 w-full px-2">
        <Skeleton className="h-full w-full" />
      </div>
    </Card>
  )
}

export function CostChartSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-3.5 w-64" />
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <Skeleton className="h-[280px] w-full" />
      </CardContent>
    </Card>
  )
}

export function RecentConversationsTableSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <Skeleton className="h-5 w-44" />
        <Skeleton className="mt-2 h-3.5 w-72" />
      </CardHeader>
      <CardContent className="space-y-3 pb-6">
        {Array.from({ length: 5 }).map((_, i) => (
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
  )
}
