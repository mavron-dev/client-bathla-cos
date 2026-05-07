'use client'

import { useMemo } from 'react'
import { SortableContext, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cva } from 'class-variance-authority'
import { IconPlus } from '@tabler/icons-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TaskCard } from './task-card'
import type { TaskColumnDef, TaskMode, TaskWithUsers } from '../types'

interface TaskColumnProps {
  column: TaskColumnDef
  tasks: TaskWithUsers[]
  mode: TaskMode
  onAddTask?: (status: TaskColumnDef['id']) => void
  onViewTask?: (task: TaskWithUsers) => void
}

export type TaskColumnDragData = {
  type: 'Column'
  column: TaskColumnDef
}

const variants = cva(
  'h-full w-full min-w-[260px] flex-shrink-0 flex flex-col rounded-lg border bg-muted/30',
  {
    variants: {
      dragging: {
        default: '',
        over: 'ring-2 opacity-30',
        overlay: 'ring-2 ring-primary',
      },
    },
  },
)

export function TaskColumn({
  column,
  tasks,
  mode,
  onAddTask,
  onViewTask,
}: TaskColumnProps) {
  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks])

  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'Column', column } satisfies TaskColumnDragData,
    attributes: { roleDescription: `Column: ${column.title}` },
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={variants({
        dragging: isDragging ? 'over' : undefined,
      })}
    >
      <CardHeader
        className={`flex flex-row items-center justify-between rounded-t-lg p-3 ${column.headerClass}`}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">{column.title}</span>
          <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
            {tasks.length}
          </Badge>
        </div>
        {mode === 'admin' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-background/40"
            onClick={() => onAddTask?.(column.id)}
            title="Add task"
          >
            <IconPlus className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-2">
        <ScrollArea className="h-[calc(70vh-100px)]">
          <SortableContext items={taskIds}>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onViewTask?.(task)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <IconPlus className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">Drop tasks here</p>
              </div>
            )}
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
