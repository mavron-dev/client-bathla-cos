'use client'

import * as React from 'react'
import Link from 'next/link'
import { IconChevronDown, IconArrowRight } from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { JSONViewer } from './json-viewer'

export function RawPayloadCard({
  data,
  webhookAuditId,
}: {
  data: unknown
  webhookAuditId: string | null
}) {
  // Now that the card spans the full page width, default-expand the JSON
  // tree — the user can collapse it if it's noisy.
  const [open, setOpen] = React.useState(true)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Raw payload</CardTitle>
        <div className="flex items-center gap-2">
          {webhookAuditId && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/admin/observability/webhooks/${webhookAuditId}`}>
                View audit row
                <IconArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Collapse' : 'Expand'}
            <IconChevronDown
              className={cn(
                'ml-1 size-3.5 transition-transform',
                open && 'rotate-180',
              )}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {open && (
          <div className="bg-muted/30 max-h-[600px] overflow-auto rounded-md p-4">
            <JSONViewer data={data} initiallyExpanded />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
