'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { useUserFiltersStore } from '../store'
import { UsersToolbar } from './users-toolbar'
import { UsersTable } from './users-table'
import { AddUserDialog } from './add-user-dialog'
import { EditUserDialog } from './edit-user-dialog'
import { DeactivateUserDialog } from './deactivate-user-dialog'
import type { PublicUser } from '../types'

interface UsersListDashboardProps {
  initialUsers: PublicUser[]
}

export function UsersListDashboard({ initialUsers }: UsersListDashboardProps) {
  const router = useRouter()
  const { search, roles, status } = useUserFiltersStore()

  const [addOpen, setAddOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deactivatingUser, setDeactivatingUser] = useState<PublicUser | null>(null)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filtered = useMemo(() => {
    let res = initialUsers
    if (status === 'active') res = res.filter((u) => u.isActive)
    else if (status === 'inactive') res = res.filter((u) => !u.isActive)
    if (roles.length > 0) res = res.filter((u) => roles.includes(u.role))
    if (search) {
      const q = search.toLowerCase()
      res = res.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phoneE164.includes(q),
      )
    }
    return res
  }, [initialUsers, search, roles, status])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => setIsRefreshing(false), 800)
  }, [router])

  const handleEdit = useCallback((user: PublicUser) => {
    setEditingUser(user)
    setEditOpen(true)
  }, [])

  const handleDeactivate = useCallback((user: PublicUser) => {
    setDeactivatingUser(user)
    setDeactivateOpen(true)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            All members of the organisation. Click a row to open their profile.
          </p>
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

      <UsersToolbar
        totalUsers={filtered.length}
        onAddUser={() => setAddOpen(true)}
      />

      <UsersTable
        users={filtered}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
      />

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={handleRefresh}
      />

      <EditUserDialog
        user={editingUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={handleRefresh}
      />

      <DeactivateUserDialog
        user={deactivatingUser}
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
