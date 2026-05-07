import PageContainer from '@/components/layout/page-container'
import { requireAdminOrDev } from '@/lib/requireAuth'
import { sessionAuthContext } from '@/lib/api-auth'
import { listUsers } from '@/server/users/service'
import { UsersListDashboard } from '@/features/users/components'

export const metadata = {
  title: 'Users · Admin · Bathla COS',
}

export default async function AdminUsersPage() {
  const session = await requireAdminOrDev()
  const ctx = sessionAuthContext(session)
  // 'all' so the admin can toggle to inactive users client-side without a
  // round-trip; the toolbar status filter applies on top of this initial set.
  const users = await listUsers(ctx, { status: 'all', limit: 200 })

  return (
    <PageContainer scrollable>
      <UsersListDashboard initialUsers={users} />
    </PageContainer>
  )
}
