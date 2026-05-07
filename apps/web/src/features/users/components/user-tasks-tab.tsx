import Link from 'next/link'
import { IconArrowRight, IconLayoutKanban } from '@tabler/icons-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Tasks tab — for now this is a focused CTA that deep-links to the existing
 * /admin/tasks board pre-filtered to this user. The shared tasks page
 * already has full CRUD + filters, so we don't duplicate it here.
 */
export function UserTasksTab({ userId }: { userId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks</CardTitle>
        <CardDescription>
          Open the main tasks board pre-filtered to everything assigned to
          this user.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-border/60 bg-muted/30 flex items-center justify-between gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-background border-border rounded-md border p-2">
              <IconLayoutKanban className="size-5" />
            </div>
            <div>
              <div className="text-sm font-medium">Tasks board</div>
              <div className="text-muted-foreground text-xs">
                Kanban + table views, filters, status updates, audit log.
              </div>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/admin/tasks?assignedToId=${userId}`}
              prefetch={false}
            >
              Open tasks
              <IconArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
