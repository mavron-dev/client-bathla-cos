'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cva } from 'class-variance-authority'
import {
  IconGripVertical,
  IconCalendar,
  IconRobot,
  IconTag,
} from '@tabler/icons-react'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { TASK_PRIORITY_META, type TaskWithUsers } from '../types'

interface TaskCardProps {
  task: TaskWithUsers
  isOverlay?: boolean
  onClick?: () => void
}

export type TaskDragData = {
  type: 'Task'
  task: TaskWithUsers
}

const cardVariants = cva(
  'mb-2 cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-t from-primary/5 to-card shadow-sm',
  {
    variants: {
      dragging: {
        over: 'ring-2 opacity-30',
        overlay: 'ring-2 ring-primary',
      },
    },
  },
)

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function TaskCard({ task, isOverlay, onClick }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task } satisfies TaskDragData,
    attributes: { roleDescription: 'Task' },
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  }

  const priority = TASK_PRIORITY_META[task.priority]
  const overdue =
    !!task.deadline && task.status !== 'done' && isPast(new Date(task.deadline))

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={cardVariants({
        dragging: isOverlay ? 'overlay' : isDragging ? 'over' : undefined,
      })}
    >
      <CardHeader className="flex flex-row items-start gap-2 p-3 pb-2">
        <Button
          variant="ghost"
          {...attributes}
          {...listeners}
          className="text-muted-foreground -ml-1 mt-0.5 h-auto cursor-grab p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="sr-only">Move task</span>
          <IconGripVertical className="h-4 w-4" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-tight">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {task.description}
            </p>
          )}
        </div>

        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] uppercase ${priority.badgeClass}`}
        >
          {priority.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2 px-3 pb-3 pt-0">
        {task.deadline && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
            }`}
          >
            <IconCalendar className="h-3.5 w-3.5" />
            <span title={format(new Date(task.deadline), 'PPpp')}>
              {overdue ? 'Overdue ' : ''}
              {formatDistanceToNow(new Date(task.deadline), { addSuffix: true })}
            </span>
          </div>
        )}

        {task.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <IconTag className="h-3 w-3 text-muted-foreground" />
            {task.tags.slice(0, 3).map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="px-1.5 py-0 text-[10px] font-normal"
              >
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{task.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar className="h-6 w-6">
              {task.assignee.image && (
                <AvatarImage src={task.assignee.image} alt={task.assignee.displayName} />
              )}
              <AvatarFallback className="text-[10px]">
                {initials(task.assignee.displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground">
              {task.assignee.displayName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            {task.creator ? (
              <span title={`Created by ${task.creator.displayName}`}>
                {task.creator.displayName.split(' ')[0]}
              </span>
            ) : (
              <>
                <IconRobot className="h-3.5 w-3.5" />
                <span>Agent</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
