'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { IconReload } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

/**
 * Replay button for an ElevenLabs post_call_transcription audit row. Calls
 * the existing `/api/admin/webhook-audit/[id]/replay` endpoint (built in the
 * webhook v2 work) and refreshes the page on success so the new processing
 * status / linked entities are reflected.
 */
export function ReplayButton({
  auditId,
  disabled = false,
  reason,
}: {
  auditId: string
  disabled?: boolean
  reason?: string
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const onClick = async () => {
    setPending(true)
    try {
      const res = await fetch(
        `/api/admin/webhook-audit/${auditId}/replay`,
        { method: 'POST' },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = (json as { error?: string })?.error ?? 'Replay failed'
        throw new Error(err)
      }
      const outcome = (json as { data?: { outcome?: { status?: string } } })
        ?.data?.outcome?.status
      toast.success(
        outcome ? `Replayed: ${outcome}` : 'Webhook replayed successfully',
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Replay failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      disabled={pending || disabled}
      title={reason}
    >
      <IconReload
        className={`mr-1 size-3.5 ${pending ? 'animate-spin' : ''}`}
      />
      {pending ? 'Replaying…' : 'Replay'}
    </Button>
  )
}
