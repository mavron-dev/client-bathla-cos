'use client'

import * as React from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString())
      next.set(key, value)
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, sp],
  )

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs
        value={currentTab}
        onValueChange={(v) => setParam('tab', v)}
        className="w-fit"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
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
            onClick={() => setParam('range', r.value)}
            className={cn(
              'h-[calc(100%-1px)] rounded-md px-3 text-sm font-medium transition-colors',
              currentRange === r.value
                ? 'bg-background text-foreground shadow-sm'
                : 'hover:text-foreground',
            )}
          >
            {r.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
