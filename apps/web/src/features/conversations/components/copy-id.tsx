'use client'

import * as React from 'react'
import { IconCopy, IconCheck } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

/**
 * Click-to-copy text + tiny icon. The metadata card uses this for IDs
 * (conversation, agent) so they're easy to grab for ngrok logs / curl.
 */
export function CopyId({
  value,
  display,
  className,
}: {
  value: string
  display?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  const onClick = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      const t = setTimeout(() => setCopied(false), 1200)
      return () => clearTimeout(t)
    } catch {
      // clipboard blocked — silently no-op
    }
  }, [value])

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'hover:bg-muted/50 group flex max-w-full items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs',
        className,
      )}
      title="Copy to clipboard"
    >
      <span className="truncate">{display ?? value}</span>
      {copied ? (
        <IconCheck className="size-3 shrink-0 text-emerald-500" />
      ) : (
        <IconCopy className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  )
}
