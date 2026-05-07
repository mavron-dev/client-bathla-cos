'use client'

import * as React from 'react'
import { IconChevronRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

/**
 * Lightweight recursive JSON tree. We don't need the full power of
 * react-json-view; this handles the ~5 cases that appear in our payloads
 * (object, array, string, number, bool, null) with collapsible nested
 * structures and subtle syntax colours that read in both light and dark
 * modes. Click a key to copy; click the chevron to expand/collapse.
 */
export function JSONViewer({
  data,
  initiallyExpanded = false,
  className,
}: {
  data: unknown
  initiallyExpanded?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'font-mono text-xs leading-relaxed',
        'overflow-x-auto',
        className,
      )}
    >
      <Node value={data} depth={0} initiallyExpanded={initiallyExpanded} />
    </div>
  )
}

function Node({
  value,
  depth,
  initiallyExpanded,
  punctuation,
}: {
  value: unknown
  depth: number
  initiallyExpanded: boolean
  /** Trailing punctuation, e.g. comma between siblings. */
  punctuation?: string
}) {
  if (value === null) return <Primitive type="null">null{punctuation}</Primitive>
  if (typeof value === 'boolean')
    return (
      <Primitive type="boolean">
        {String(value)}
        {punctuation}
      </Primitive>
    )
  if (typeof value === 'number')
    return (
      <Primitive type="number">
        {value}
        {punctuation}
      </Primitive>
    )
  if (typeof value === 'string')
    return (
      <Primitive type="string">
        &quot;{value}&quot;
        {punctuation}
      </Primitive>
    )
  if (Array.isArray(value)) {
    return (
      <CollapsibleNode
        depth={depth}
        initiallyExpanded={depth === 0 && initiallyExpanded}
        openBracket="["
        closeBracket="]"
        emptyText="[]"
        count={value.length}
        punctuation={punctuation}
        items={value.map((v, i) => ({
          key: String(i),
          render: (open: boolean) => (
            <Node
              value={v}
              depth={depth + 1}
              initiallyExpanded={open}
              punctuation={i < value.length - 1 ? ',' : undefined}
            />
          ),
        }))}
      />
    )
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    return (
      <CollapsibleNode
        depth={depth}
        initiallyExpanded={depth === 0 && initiallyExpanded}
        openBracket="{"
        closeBracket="}"
        emptyText="{}"
        count={entries.length}
        punctuation={punctuation}
        items={entries.map(([k, v], i) => ({
          key: k,
          renderKey: <Key>{k}</Key>,
          render: (open: boolean) => (
            <Node
              value={v}
              depth={depth + 1}
              initiallyExpanded={open}
              punctuation={i < entries.length - 1 ? ',' : undefined}
            />
          ),
        }))}
      />
    )
  }
  // Fallback for anything weird (Symbol, BigInt) — stringify.
  return (
    <Primitive type="number">
      {String(value)}
      {punctuation}
    </Primitive>
  )
}

function CollapsibleNode({
  depth,
  initiallyExpanded,
  openBracket,
  closeBracket,
  emptyText,
  count,
  items,
  punctuation,
}: {
  depth: number
  initiallyExpanded: boolean
  openBracket: string
  closeBracket: string
  emptyText: string
  count: number
  items: Array<{
    key: string
    renderKey?: React.ReactNode
    render: (open: boolean) => React.ReactNode
  }>
  punctuation?: string
}) {
  const [open, setOpen] = React.useState(initiallyExpanded)
  if (count === 0) {
    return <Primitive type="null">{emptyText}{punctuation}</Primitive>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="hover:bg-muted/40 -ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5"
        aria-expanded={open}
      >
        <IconChevronRight
          className={cn(
            'text-muted-foreground size-3 transition-transform',
            open && 'rotate-90',
          )}
        />
        <span className="text-muted-foreground">{openBracket}</span>
        {!open && (
          <span className="text-muted-foreground italic">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
        )}
        {!open && (
          <>
            <span className="text-muted-foreground">{closeBracket}</span>
            {punctuation && (
              <span className="text-muted-foreground">{punctuation}</span>
            )}
          </>
        )}
      </button>
      {open && (
        <>
          <div className={cn('border-border/40 ml-2 border-l pl-3')}>
            {items.map((it) => (
              <div key={it.key} className="flex flex-row flex-wrap gap-x-2">
                {it.renderKey && (
                  <>
                    {it.renderKey}
                    <span className="text-muted-foreground">:</span>
                  </>
                )}
                <div className="min-w-0 flex-1">{it.render(false)}</div>
              </div>
            ))}
          </div>
          <span className="text-muted-foreground">{closeBracket}</span>
          {punctuation && (
            <span className="text-muted-foreground">{punctuation}</span>
          )}
        </>
      )}
    </div>
  )
}

function Key({ children }: { children: string }) {
  return <span className="text-foreground/80">&quot;{children}&quot;</span>
}

function Primitive({
  type,
  children,
}: {
  type: 'string' | 'number' | 'boolean' | 'null'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        type === 'string' && 'text-emerald-600 dark:text-emerald-400',
        type === 'number' && 'text-amber-600 dark:text-amber-400',
        type === 'boolean' && 'text-violet-600 dark:text-violet-400',
        type === 'null' && 'text-muted-foreground italic',
      )}
    >
      {children}
    </span>
  )
}
