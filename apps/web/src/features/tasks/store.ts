import { create } from 'zustand'
import type { TaskStatus, TaskPriority } from '@bathla-cos/database'
import type { TaskFilters, TaskViewMode } from './types'

type TaskFiltersState = {
  viewMode: TaskViewMode
  filters: TaskFilters
  setViewMode: (mode: TaskViewMode) => void
  setSearch: (search: string) => void
  setStatusFilter: (status: TaskStatus[]) => void
  setPriorityFilter: (priority: TaskPriority[]) => void
  reset: () => void
}

const initialFilters: TaskFilters = {
  search: '',
  status: [],
  priority: [],
}

export const useTaskFiltersStore = create<TaskFiltersState>((set) => ({
  viewMode: 'kanban',
  filters: initialFilters,
  setViewMode: (mode) => set({ viewMode: mode }),
  setSearch: (search) =>
    set((s) => ({ filters: { ...s.filters, search } })),
  setStatusFilter: (status) =>
    set((s) => ({ filters: { ...s.filters, status } })),
  setPriorityFilter: (priority) =>
    set((s) => ({ filters: { ...s.filters, priority } })),
  reset: () => set({ filters: initialFilters }),
}))
