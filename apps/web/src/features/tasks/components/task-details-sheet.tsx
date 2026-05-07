'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  IconCalendar,
  IconPencil,
  IconTrash,
  IconRobot,
  IconUserCircle,
  IconBolt,
  IconTag,
  IconHistory,
} from '@tabler/icons-react'
import { format, isPast } from 'date-fns'
import {
  TASK_COLUMNS,
  TASK_PRIORITY_META,
  type TaskMode,
  type TaskWithUpdates,
} from '../types'

interface TaskDetailsSheetProps {
  task: TaskWithUpdates | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: TaskMode
  onEdit?: (task: TaskWithUpdates) => void
  onDelete?: (taskId: string) => void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function TaskDetailsSheet({
  task,
  open,
  onOpenChange,
  mode,
  onEdit,
  onDelete,
}: TaskDetailsSheetProps) {
  if (!task) return null

  const statusCol = TASK_COLUMNS.find((c) => c.id === task.status)
  const priority = TASK_PRIORITY_META[task.priority]
  const overdue =
    !!task.deadline && task.status !== 'done' && isPast(new Date(task.deadline))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-6 pb-4 pt-6">
          <SheetTitle className="flex flex-wrap items-center gap-2">
            {task.title}
            <Badge variant="secondary" className={statusCol?.headerClass}>
              {statusCol?.title ?? task.status}
            </Badge>
          </SheetTitle>
          <SheetDescription>Task details and audit history</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-6 p-6">
            {task.description && (
              <div>
                <h4 className="mb-1 text-sm font-medium text-muted-foreground">
                  Description
                </h4>
                <p className="whitespace-pre-wrap text-sm">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <IconBolt className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge
                    variant="outline"
                    className={`mt-1 text-[10px] uppercase ${priority.badgeClass}`}
                  >
                    {priority.label}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <IconCalendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className={`text-sm ${overdue ? 'text-red-600' : ''}`}>
                    {task.deadline
                      ? format(new Date(task.deadline), 'PP')
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="col-span-2">
                <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <IconUserCircle className="h-4 w-4" /> Assignee
                </p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {task.assignee.image && (
                      <AvatarImage
                        src={task.assignee.image}
                        alt={task.assignee.displayName}
                      />
                    )}
                    <AvatarFallback className="text-[11px]">
                      {initials(task.assignee.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{task.assignee.displayName}</span>
                </div>
              </div>

              <div className="col-span-2">
                <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {task.creator ? <IconUserCircle className="h-4 w-4" /> : <IconRobot className="h-4 w-4" />}
                  Created by
                </p>
                <p className="text-sm">
                  {task.creator ? task.creator.displayName : 'Agent'}
                  <span className="ml-2 text-xs text-muted-foreground">
                    on {format(new Date(task.createdAt), 'PP')} via {task.source}
                  </span>
                </p>
              </div>
            </div>

            {task.tags.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <IconTag className="h-4 w-4" /> Tags
                </p>
                <div className="flex flex-wrap gap-1">
                  {task.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs font-normal">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IconHistory className="h-4 w-4" /> History
              </h4>
              {task.updates.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">
                  No history yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {task.updates.map((u) => (
                    <li key={u.id} className="rounded-md border bg-muted/30 p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">
                          {u.updateType.replace('_', ' ')}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(u.createdAt), 'd MMM, HH:mm')}
                        </span>
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        by {u.updatedBy?.displayName ?? 'Agent'} • via {u.source}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  onOpenChange(false)
                  onEdit?.(task)
                }}
              >
                <IconPencil className="h-4 w-4" />
                Edit
              </Button>
              {mode === 'admin' && (
                <Button
                  variant="destructive"
                  className="gap-2 text-white"
                  onClick={() => {
                    onOpenChange(false)
                    onDelete?.(task.id)
                  }}
                >
                  <IconTrash className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
