'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { IconRefresh, IconLoader2 } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export function SummaryRefreshButton() {
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
