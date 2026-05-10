'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { IconLoader2 } from '@tabler/icons-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'cost', label: 'Cost' },
  { value: 'quality', label: 'Quality' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'users', label: 'Per-user' },
] as const

export type AnalyticsTab = (typeof TABS)[number]['value']

const RANGES = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
] as const

export type AnalyticsRangePreset = (typeof RANGES)[number]['value']

export function AnalyticsControls({
  currentTab,
  currentRange,
}: {
  currentTab: AnalyticsTab
  currentRange: AnalyticsRangePreset
}) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [isPending, startTransition] = React.useTransition()
  const [pendingTabRaw, setPendingTab] = React.useState<AnalyticsTab | null>(
    null,
  )
  const [pendingRangeRaw, setPendingRange] =
    React.useState<AnalyticsRangePreset | null>(null)

  // Derive the visible pending value from `isPending` so the spinner clears
  // automatically when the navigation transition resolves — no clearing effect
  // needed.
  const pendingTab = isPending ? pendingTabRaw : null
  const pendingRange = isPending ? pendingRangeRaw : null

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString())
      next.set(key, value)
      const qs = next.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname)
      })
    },
    [router, pathname, sp],
  )

  const handleTabChange = React.useCallback(
    (v: AnalyticsTab) => {
      if (v === currentTab) return
      setPendingTab(v)
      setParam('tab', v)
    },
    [currentTab, setParam],
  )

  const handleRangeChange = React.useCallback(
    (v: AnalyticsRangePreset) => {
      if (v === currentRange) return
      setPendingRange(v)
      setParam('range', v)
    },
    [currentRange, setParam],
  )

  const activeTab = pendingTab ?? currentTab
  const activeRange = pendingRange ?? currentRange

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs
        value={activeTab}
        onValueChange={(v) => handleTabChange(v as AnalyticsTab)}
        className="w-fit"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {pendingTab === t.value && (
                <IconLoader2 className="ml-1 size-3 animate-spin" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]">
        {RANGES.map((r) => (
          <Button
            key={r.value}
            variant="ghost"
            size="sm"
            onClick={() => handleRangeChange(r.value)}
            className={cn(
              'h-[calc(100%-1px)] cursor-pointer rounded-md px-3 text-sm font-medium transition-colors',
              activeRange === r.value
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground',
            )}
          >
            {r.label}
            {pendingRange === r.value && (
              <IconLoader2 className="ml-1 size-3 animate-spin" />
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
