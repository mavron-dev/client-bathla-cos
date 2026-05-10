'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { JobDetailContent } from './job-detail-content'
import { jobsApi } from '@/features/jobs/lib/api-client'
import { ApiClientError } from '@/features/tasks/lib/api-client'
import {
  patchSearchParams,
  searchParamsToString,
} from '@/features/jobs/lib/url-state'
import type { JobDetailPayload } from '@/lib/dashboard/jobs'

/**
 * Mounted on the Jobs page. Reads `?selected=<uuid>` from the URL — when set,
 * fetches the job and opens the Sheet. Closing the Sheet (or clicking the
 * overlay) clears the URL param so the back button works naturally.
 *
 * Implementation note: the inner fetcher is keyed by `selected` so each
 * selection mounts a fresh component with fresh state; this keeps us out of
 * the "setState synchronously inside useEffect" anti-pattern.
 */
export function JobDetailDrawer() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const selected = sp.get('selected')

  const close = () => {
    const next = patchSearchParams(sp, { selected: null }, { resetPage: false })
    router.replace(`${pathname}${searchParamsToString(next)}`)
  }

  return (
    <Sheet
      open={!!selected}
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-2xl"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Job detail</SheetTitle>
          <SheetDescription>
            Inspect payload and output, retry from here when applicable.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto pt-4">
          {selected && <JobDetailFetcher key={selected} jobId={selected} />}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function JobDetailFetcher({ jobId }: { jobId: string }) {
  const [job, setJob] = React.useState<JobDetailPayload | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Re-fetch helper for the retry callback.
  const refetch = React.useCallback(() => {
    jobsApi
      .get(jobId)
      .then((j) => setJob(j))
      .catch(() => undefined)
  }, [jobId])

  React.useEffect(() => {
    let cancelled = false
    jobsApi
      .get(jobId)
      .then((j) => {
        if (!cancelled) setJob(j)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiClientError) setError(err.message)
        else setError('Failed to load job')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="space-y-3 px-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }
  if (error) {
    return <div className="text-muted-foreground px-4 text-sm">{error}</div>
  }
  if (!job) {
    return <div className="text-muted-foreground px-4 text-sm">Not found</div>
  }
  return <JobDetailContent job={job} onRetried={refetch} />
}
