'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { IconRefresh, IconLoader2 } from '@tabler/icons-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { jobsApi } from '@/features/jobs/lib/api-client'
import { ApiClientError } from '@/features/tasks/lib/api-client'

export function JobRetryButton({
  jobId,
  onRetried,
}: {
  jobId: string
  onRetried?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()

  const click = () => {
    startTransition(async () => {
      try {
        await jobsApi.retry(jobId)
        toast.success(
          'Job queued for retry — worker will pick it up in the next cycle.',
        )
        router.refresh()
        onRetried?.()
      } catch (err) {
        if (err instanceof ApiClientError && err.status === 409) {
          toast.error('Job is no longer retryable')
          // Refresh anyway so the UI catches up to whatever state the job is
          // really in (e.g. someone else retried it).
          router.refresh()
          return
        }
        const message = err instanceof Error ? err.message : 'Retry failed'
        toast.error(message)
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={click}
      disabled={pending}
      className="gap-2"
    >
      {pending ? (
        <IconLoader2 className="size-3.5 animate-spin" />
      ) : (
        <IconRefresh className="size-3.5" />
      )}
      Retry
    </Button>
  )
}
