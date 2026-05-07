import { create } from 'zustand'
import type { UserRole } from '@bathla-cos/database'
import type { UserStatusFilter } from './types'

type UserFiltersState = {
  search: string
  roles: UserRole[]
  status: UserStatusFilter
  setSearch: (search: string) => void
  setRoles: (roles: UserRole[]) => void
  setStatus: (status: UserStatusFilter) => void
  reset: () => void
}

const initial = {
  search: '',
  roles: [] as UserRole[],
  status: 'active' as UserStatusFilter,
}

export const useUserFiltersStore = create<UserFiltersState>((set) => ({
  ...initial,
  setSearch: (search) => set({ search }),
  setRoles: (roles) => set({ roles }),
  setStatus: (status) => set({ status }),
  reset: () => set(initial),
}))
