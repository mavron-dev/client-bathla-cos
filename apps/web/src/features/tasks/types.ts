import type { TaskStatus, TaskPriority } from '@bathla-cos/database'
import type { TaskWithUsers, TaskWithUpdates } from '@/server/tasks/service'
import type { PublicUser } from '@/server/users/service'

export type { TaskWithUsers, TaskWithUpdates, PublicUser }

// Kanban column definitions, in display order. Mirrors LEAD_COLUMNS pattern
// from `inspiration/src-1/features/leads/types.ts`.
export type TaskColumnDef = {
  id: TaskStatus
  title: string
  // Tailwind classes used by `task-column.tsx` for header tinting.
  headerClass: string
}

export const TASK_COLUMNS: TaskColumnDef[] = [
  {
    id: 'pending',
    title: 'Pending',
    headerClass: 'text-slate-700 bg-slate-100 dark:bg-slate-800/50 dark:text-slate-200',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    headerClass: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-200',
  },
  {
    id: 'done',
    title: 'Done',
    headerClass: 'text-green-700 bg-green-50 dark:bg-green-950/40 dark:text-green-200',
  },
  {
    id: 'deferred',
    title: 'Deferred',
    headerClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-200',
  },
  {
    id: 'cancelled',
    title: 'Cancelled',
    headerClass: 'text-gray-600 bg-gray-100 dark:bg-gray-800/50 dark:text-gray-400',
  },
]

export type TaskPriorityMeta = {
  id: TaskPriority
  label: string
  // Tailwind classes for the badge on the card / table row.
  badgeClass: string
  // Sort weight (urgent = 4, low = 1) used by client-side sorts.
  weight: number
}

export const TASK_PRIORITY_META: Record<TaskPriority, TaskPriorityMeta> = {
  urgent: {
    id: 'urgent',
    label: 'Urgent',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300',
    weight: 4,
  },
  high: {
    id: 'high',
    label: 'High',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-300',
    weight: 3,
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
    weight: 2,
  },
  low: {
    id: 'low',
    label: 'Low',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300',
    weight: 1,
  },
}

export type TaskViewMode = 'kanban' | 'table'

export type TaskMode = 'admin' | 'executive'

export type TaskFilters = {
  search: string
  status: TaskStatus[]
  priority: TaskPriority[]
}
