'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { IconSearch, IconX } from '@tabler/icons-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STATUS = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'orphaned', label: 'Orphaned' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'failed', label: 'Failed' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'received', label: 'Received' },
] as const

const SOURCES = [
  { value: 'all', label: 'All sources' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'whatsapp_meta', label: 'WhatsApp / Meta' },
  { value: 'cost_tracker', label: 'Cost tracker' },
] as const

const SIGNATURE = [
  { value: 'all', label: 'Any signature' },
  { value: 'true', label: 'Valid only' },
  { value: 'false', label: 'Invalid only' },
] as const

export function AuditLogFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [eventType, setEventType] = React.useState(sp.get('eventType') ?? '')

  React.useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString())
      if (eventType) next.set('eventType', eventType)
      else next.delete('eventType')
      next.delete('page')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString())
    if (value === 'all' || !value) next.delete(key)
    else next.set(key, value)
    next.delete('page')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const sourceValue = sp.get('source') ?? 'all'
  const statusValue = sp.get('status') ?? 'all'
  const signatureValue = sp.get('signatureValid') ?? 'all'

  const hasAny =
    eventType ||
    sourceValue !== 'all' ||
    statusValue !== 'all' ||
    signatureValue !== 'all'

  const clearAll = () => {
    setEventType('')
    router.replace(pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1 max-w-xs">
        <IconSearch className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="Filter by event type…"
          className="pl-8 font-mono text-xs"
        />
      </div>

      <Select value={sourceValue} onValueChange={(v) => setParam('source', v)}>
        <SelectTrigger className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SOURCES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusValue} onValueChange={(v) => setParam('status', v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={signatureValue}
        onValueChange={(v) => setParam('signatureValid', v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SIGNATURE.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasAny && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-muted-foreground"
        >
          <IconX className="size-4" />
          Clear
        </Button>
      )}
    </div>
  )
}
