'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove } from '@dnd-kit/sortable'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import type { TaskStatus } from '@bathla-cos/database'
import { TaskColumn } from './task-column'
import { TaskCard } from './task-card'
import { TASK_COLUMNS, type TaskMode, type TaskWithUsers } from '../types'
import { tasksApi, ApiClientError } from '../lib/api-client'

interface TasksKanbanBoardProps {
  tasks: TaskWithUsers[]
  mode: TaskMode
  onAddTask?: (status: TaskStatus) => void
  onTasksChange?: () => void
  onViewTask?: (task: TaskWithUsers) => void
}

export function TasksKanbanBoard({
  tasks: initialTasks,
  mode,
  onAddTask,
  onTasksChange,
  onViewTask,
}: TasksKanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithUsers[]>(initialTasks)
  const [activeTaskId, setActiveTaskId] = useState<UniqueIdentifier | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const originalStatusRef = useRef<TaskStatus | null>(null)

  useEffect(() => setTasks(initialTasks), [initialTasks])
  useEffect(() => setIsMounted(true), [])

  const columnIds = useMemo(() => TASK_COLUMNS.map((c) => c.id), [])
  const activeTask = useMemo(
    () => tasks.find((t) => t.id === activeTaskId),
    [tasks, activeTaskId],
  )

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  )

  const getTasksByStatus = useCallback(
    (status: TaskStatus) => tasks.filter((t) => t.status === status),
    [tasks],
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = active.data.current?.task as TaskWithUsers | undefined
    originalStatusRef.current = task?.status ?? null
    setActiveTaskId(active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return
    const activeId = active.id
    const overId = over.id
    if (activeId === overId) return

    const activeData = active.data.current
    const overData = over.data.current
    const isActiveTask = activeData?.type === 'Task'
    const isOverTask = overData?.type === 'Task'
    const isOverColumn = overData?.type === 'Column'
    if (!isActiveTask) return

    if (isActiveTask && isOverTask) {
      setTasks((current) => {
        const activeIndex = current.findIndex((t) => t.id === activeId)
        const overIndex = current.findIndex((t) => t.id === overId)
        if (activeIndex < 0 || overIndex < 0) return current
        if (current[activeIndex].status !== current[overIndex].status) {
          current[activeIndex] = {
            ...current[activeIndex],
            status: current[overIndex].status,
          }
        }
        return arrayMove(current, activeIndex, overIndex)
      })
    }

    if (isActiveTask && isOverColumn) {
      setTasks((current) => {
        const activeIndex = current.findIndex((t) => t.id === activeId)
        if (activeIndex < 0) return current
        const newStatus = overId as TaskStatus
        if (current[activeIndex].status !== newStatus) {
          return current.map((t, i) =>
            i === activeIndex ? { ...t, status: newStatus } : t,
          )
        }
        return current
      })
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTaskId(null)
    const originalStatus = originalStatusRef.current
    originalStatusRef.current = null

    if (!over) return
    const activeData = active.data.current
    if (activeData?.type !== 'Task') return

    const taskId = active.id as string
    let newStatus: TaskStatus | null = null
    const overData = over.data.current

    if (overData?.type === 'Column') {
      newStatus = over.id as TaskStatus
    } else if (overData?.type === 'Task') {
      newStatus = (overData.task as TaskWithUsers)?.status ?? null
    }
    if (!newStatus) {
      const cur = tasks.find((t) => t.id === taskId)
      newStatus = cur?.status ?? null
    }
    if (!newStatus || !originalStatus || newStatus === originalStatus) return

    try {
      await tasksApi.updateStatus(taskId, { status: newStatus })
      toast.success(`Task moved to ${newStatus.replace('_', ' ')}`)
      onTasksChange?.()
    } catch (error) {
      // Revert optimistic UI on error
      setTasks(initialTasks)
      const msg =
        error instanceof ApiClientError
          ? error.message
          : 'Failed to update task status'
      toast.error(msg)
    }
  }

  if (!isMounted) return null

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <ScrollArea>
        <div className="grid grid-cols-1 gap-4 p-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SortableContext items={columnIds}>
            {TASK_COLUMNS.map((column) => (
              <TaskColumn
                key={column.id}
                column={column}
                tasks={getTasksByStatus(column.id)}
                mode={mode}
                onAddTask={onAddTask}
                onViewTask={onViewTask}
              />
            ))}
          </SortableContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} isOverlay />}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  )
}
