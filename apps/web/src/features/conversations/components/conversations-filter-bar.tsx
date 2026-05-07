'use client'

import * as React from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
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

const SUCCESS_OPTIONS = [
  { value: 'all', label: 'All outcomes' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'unknown', label: 'Unknown' },
] as const

const CHANNEL_OPTIONS = [
  { value: 'all', label: 'All channels' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'dashboard_chat', label: 'Dashboard chat' },
] as const

const LANGUAGE_OPTIONS = [
  { value: 'all', label: 'All languages' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'hi-en', label: 'Hinglish' },
] as const

export function ConversationsFilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [search, setSearch] = React.useState(sp.get('search') ?? '')

  // Debounced search → URL. Reset page on every filter change so we never
  // land on an empty page (e.g. you were on page 4 and filtered to a result
  // that has only 1 page).
  React.useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString())
      if (search) next.set('search', search)
      else next.delete('search')
      next.delete('page')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString())
    if (value === 'all' || !value) next.delete(key)
    else next.set(key, value)
    next.delete('page')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  const successValue = sp.get('success') ?? 'all'
  const channelValue = sp.get('channel') ?? 'all'
  const languageValue = sp.get('language') ?? 'all'

  const hasAny =
    search ||
    successValue !== 'all' ||
    channelValue !== 'all' ||
    languageValue !== 'all'

  const clearAll = () => {
    setSearch('')
    router.replace(pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[240px] flex-1 max-w-md">
        <IconSearch className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, summary, or user…"
          className="pl-8"
        />
      </div>

      <Select
        value={successValue}
        onValueChange={(v) => setParam('success', v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUCCESS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={channelValue}
        onValueChange={(v) => setParam('channel', v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHANNEL_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={languageValue}
        onValueChange={(v) => setParam('language', v)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
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
