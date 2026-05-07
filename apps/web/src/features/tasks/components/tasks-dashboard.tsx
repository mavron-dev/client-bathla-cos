'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { IconRefresh } from '@tabler/icons-react'
import type { TaskStatus } from '@bathla-cos/database'
import { useTaskFiltersStore } from '../store'
import { TasksToolbar } from './tasks-toolbar'
import { TasksKanbanBoard } from './tasks-kanban-board'
import { TasksTable } from './tasks-table'
import { AddTaskDialog } from './add-task-dialog'
import { EditTaskDialog } from './edit-task-dialog'
import { TaskDetailsSheet } from './task-details-sheet'
import {
  type PublicUser,
  type TaskMode,
  type TaskWithUsers,
  type TaskWithUpdates,
} from '../types'
import { tasksApi, ApiClientError } from '../lib/api-client'

interface TasksDashboardProps {
  initialTasks: TaskWithUsers[]
  mode: TaskMode
  /** Required when mode === 'admin' (used by the assignee dropdown). */
  users?: PublicUser[]
  pageTitle?: string
  pageDescription?: string
}

export function TasksDashboard({
  initialTasks,
  mode,
  users = [],
  pageTitle,
  pageDescription,
}: TasksDashboardProps) {
  const router = useRouter()
  const { viewMode, filters } = useTaskFiltersStore()

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addDialogDefaultStatus, setAddDialogDefaultStatus] =
    useState<TaskStatus>('pending')

  const [editingTask, setEditingTask] = useState<TaskWithUsers | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  const [viewingTask, setViewingTask] = useState<TaskWithUpdates | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const [isRefreshing, setIsRefreshing] = useState(false)

  // Client-side filter — server already filtered by ownership for executive.
  const filteredTasks = useMemo(() => {
    let res = initialTasks
    if (filters.search) {
      const q = filters.search.toLowerCase()
      res = res.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q),
      )
    }
    if (filters.status.length > 0) {
      res = res.filter((t) => filters.status.includes(t.status))
    }
    if (filters.priority.length > 0) {
      res = res.filter((t) => filters.priority.includes(t.priority))
    }
    return res
  }, [initialTasks, filters])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 800)
  }, [router])

  const handleAddTaskFromColumn = useCallback((status: TaskStatus) => {
    setAddDialogDefaultStatus(status)
    setAddDialogOpen(true)
  }, [])

  const handleEditTask = useCallback((task: TaskWithUsers | TaskWithUpdates) => {
    setEditingTask(task)
    setEditDialogOpen(true)
  }, [])

  const handleViewTask = useCallback(async (task: TaskWithUsers) => {
    // Fetch full task (with updates) on demand so the sheet has audit history.
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(task.id)}`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to load')
      const json = (await res.json()) as { data: TaskWithUpdates }
      setViewingTask(json.data)
      setDetailsOpen(true)
    } catch {
      toast.error('Could not load task details')
    }
  }, [])

  const handleDeleteTask = useCallback((taskId: string) => {
    setDeletingId(taskId)
    setDeleteDialogOpen(true)
  }, [])

  const confirmDelete = async () => {
    if (!deletingId) return
    try {
      await tasksApi.remove(deletingId)
      toast.success('Task deleted')
      router.refresh()
    } catch (error) {
      const msg =
        error instanceof ApiClientError ? error.message : 'Failed to delete task'
      toast.error(msg)
    } finally {
      setDeleteDialogOpen(false)
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {pageTitle ?? (mode === 'admin' ? 'Tasks' : 'My Tasks')}
          </h1>
          {pageDescription && (
            <p className="text-sm text-muted-foreground">{pageDescription}</p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <TasksToolbar
        totalTasks={filteredTasks.length}
        mode={mode}
        onAddTask={() => setAddDialogOpen(true)}
      />

      {viewMode === 'kanban' ? (
        <TasksKanbanBoard
          tasks={filteredTasks}
          mode={mode}
          onAddTask={mode === 'admin' ? handleAddTaskFromColumn : undefined}
          onTasksChange={handleRefresh}
          onViewTask={handleViewTask}
        />
      ) : (
        <TasksTable
          tasks={filteredTasks}
          mode={mode}
          onView={handleViewTask}
          onEdit={mode === 'admin' ? handleEditTask : undefined}
          onDelete={mode === 'admin' ? handleDeleteTask : undefined}
        />
      )}

      {mode === 'admin' && (
        <AddTaskDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={handleRefresh}
          defaultStatus={addDialogDefaultStatus}
          users={users}
        />
      )}

      <EditTaskDialog
        task={editingTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleRefresh}
        mode={mode}
        users={users}
      />

      <TaskDetailsSheet
        task={viewingTask}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        mode={mode}
        onEdit={handleEditTask}
        onDelete={mode === 'admin' ? handleDeleteTask : undefined}
      />

      {mode === 'admin' && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                The task will be soft-deleted (hidden but not destroyed). This
                can be reversed by an admin via Prisma Studio.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
