import Link from 'next/link'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function AuditLogPagination({
  page,
  limit,
  total,
  baseSearchParams,
}: {
  page: number
  limit: number
  total: number
  baseSearchParams: URLSearchParams
}) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(total, page * limit)

  const buildHref = (p: number) => {
    const next = new URLSearchParams(baseSearchParams)
    next.set('page', String(p))
    const qs = next.toString()
    return qs ? `?${qs}` : '?'
  }

  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  return (
    <div className="flex items-center justify-between gap-4 px-2 pt-1">
      <div className="text-muted-foreground text-sm">
        Showing{' '}
        <span className="text-foreground tabular-nums">
          {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')}
        </span>{' '}
        of{' '}
        <span className="text-foreground tabular-nums">
          {total.toLocaleString('en-IN')}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          asChild={!prevDisabled}
          disabled={prevDisabled}
          variant="outline"
          size="sm"
          className={cn(prevDisabled && 'pointer-events-none opacity-50')}
        >
          {prevDisabled ? (
            <span>
              <IconChevronLeft className="size-4" />
              Prev
            </span>
          ) : (
            <Link href={buildHref(page - 1)} prefetch={false}>
              <IconChevronLeft className="size-4" />
              Prev
            </Link>
          )}
        </Button>
        <div className="text-muted-foreground px-2 text-sm tabular-nums">
          Page {page} of {totalPages}
        </div>
        <Button
          asChild={!nextDisabled}
          disabled={nextDisabled}
          variant="outline"
          size="sm"
          className={cn(nextDisabled && 'pointer-events-none opacity-50')}
        >
          {nextDisabled ? (
            <span>
              Next
              <IconChevronRight className="size-4" />
            </span>
          ) : (
            <Link href={buildHref(page + 1)} prefetch={false}>
              Next
              <IconChevronRight className="size-4" />
            </Link>
          )}
        </Button>
      </div>
    </div>
  )
}
