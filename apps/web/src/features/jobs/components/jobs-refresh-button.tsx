'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { IconRefresh, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

/**
 * Tiny client island. Triggers `router.refresh()` so the parent server
 * component re-fetches stats + list. Spinner shown via useTransition.
 */
export function JobsRefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = React.useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="gap-2"
    >
      {pending ? (
        <IconLoader2 className="size-3.5 animate-spin" />
      ) : (
        <IconRefresh className="size-3.5" />
      )}
      Refresh
    </Button>
  )
}
