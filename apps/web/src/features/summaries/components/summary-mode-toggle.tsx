'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * Daily | Weekly segmented control. Weekly is rendered visible-but-disabled
 * for Phase 1 — the IA is committed; the panel ships in a follow-up.
 */
export function SummaryModeToggle({ mode }: { mode: 'daily' | 'weekly' }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const setMode = (m: string) => {
    if (!m || m === mode) return
    const next = new URLSearchParams(sp.toString())
    if (m === 'daily') next.delete('mode')
    else next.set('mode', m)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={mode}
      onValueChange={setMode}
    >
      <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <ToggleGroupItem value="weekly" disabled>
              Weekly
            </ToggleGroupItem>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Coming soon — weekly summaries land next sprint.
        </TooltipContent>
      </Tooltip>
    </ToggleGroup>
  )
}
