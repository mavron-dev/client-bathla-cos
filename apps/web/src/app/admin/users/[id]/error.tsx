'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function UserProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[admin/users/[id]] error:', error)
  }, [error])

  return (
    <div className="flex h-[calc(100dvh-52px)] items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-lg font-semibold">Could not load profile</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Something went wrong while fetching this user&apos;s profile.
        </p>
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  )
}
