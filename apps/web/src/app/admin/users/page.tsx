import PageContainer from '@/components/layout/page-container'
import { requireAdminOrDev } from '@/lib/requireAuth'
import { getUsersWithStats } from '@/lib/dashboard/users'
import { UsersGridDashboard } from '@/features/users/components/users-grid-dashboard'

export const metadata = {
  title: 'Users · Admin · Bathla COS',
}

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  // Auth gate via the shared admin/dev helper.
  await requireAdminOrDev()

  // Status='all' so the client-side toolbar can flip between active/inactive
  // without round-tripping. The cards display an "inactive" badge inline.
  const users = await getUsersWithStats({ status: 'all' })

  return (
    <PageContainer scrollable>
      <UsersGridDashboard initialUsers={users} />
    </PageContainer>
  )
}
