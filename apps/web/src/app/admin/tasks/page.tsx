import PageContainer from '@/components/layout/page-container'
import { requireAdminOrDev } from '@/lib/requireAuth'
import { sessionAuthContext } from '@/lib/api-auth'
import { listTasks } from '@/server/tasks/service'
import { listUsers } from '@/server/users/service'
import { TasksDashboard } from '@/features/tasks/components'

export const metadata = {
  title: 'Tasks · Admin · Bathla COS',
}

export default async function AdminTasksPage() {
  const session = await requireAdminOrDev()
  const ctx = sessionAuthContext(session)

  const [tasks, users] = await Promise.all([
    listTasks(ctx, {}),
    listUsers(ctx, {}),
  ])

  return (
    <PageContainer scrollable>
      <TasksDashboard
        mode="admin"
        initialTasks={tasks}
        users={users}
        pageDescription="All active tasks across the organisation. Drag cards across columns to change status; click a card for details and audit history."
      />
    </PageContainer>
  )
}
