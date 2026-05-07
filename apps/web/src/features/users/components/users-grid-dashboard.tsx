'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { IconRefresh } from '@tabler/icons-react'
import { useUserFiltersStore } from '../store'
import { UsersToolbar } from './users-toolbar'
import { AddUserDialog } from './add-user-dialog'
import { UserCard } from './user-card'
import { EmptyState } from '@/features/dashboard/components/empty-state'
import type { UserCardStats } from '@/lib/dashboard/users'

/**
 * Cards-grid version of the users list (Wave 4). Replaces the older table
 * variant. Inline edit/deactivate were dropped — those are on the detail
 * page (`/admin/users/[id]`). The list now reads as an analytics surface
 * with an "Invite user" entry point at the top.
 */
export function UsersGridDashboard({
  initialUsers,
}: {
  initialUsers: UserCardStats[]
}) {
  const router = useRouter()
  const { search, roles, status } = useUserFiltersStore()

  const [addOpen, setAddOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filtered = useMemo(() => {
    let res = initialUsers
    if (status === 'active') res = res.filter((u) => u.isActive)
    else if (status === 'inactive') res = res.filter((u) => !u.isActive)
    if (roles.length > 0) {
      const set = new Set(roles as string[])
      res = res.filter((u) => set.has(u.role))
    }
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

  return (
    <div className="@container/main flex flex-col gap-6 px-4 pb-6 pt-2 lg:px-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground text-sm">
            Everyone using Bathla COS. Click a card to open the profile.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <IconRefresh
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      <UsersToolbar
        totalUsers={filtered.length}
        onAddUser={() => setAddOpen(true)}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="No users match these filters"
          description="Try widening your search or clearing the role / status filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {filtered.map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}

      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
