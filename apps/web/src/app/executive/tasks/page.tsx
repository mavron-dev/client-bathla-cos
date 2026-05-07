import PageContainer from '@/components/layout/page-container'
import { requireExecutive } from '@/lib/requireAuth'
import { sessionAuthContext } from '@/lib/api-auth'
import { listTasks } from '@/server/tasks/service'
import { TasksDashboard } from '@/features/tasks/components'

export const metadata = {
  title: 'My Tasks · Bathla COS',
}

export default async function ExecutiveTasksPage() {
  const session = await requireExecutive()
  const ctx = sessionAuthContext(session)

  // The task service forces `assignedToId = ctx.userId` for non-admin sessions,
  // so executives see only their own tasks regardless of any filters they pass.
  const tasks = await listTasks(ctx, {})

  return (
    <PageContainer scrollable>
      <TasksDashboard
        mode="executive"
        initialTasks={tasks}
        pageDescription="Tasks assigned to you. Drag a card across columns to update its status, or open a card to edit description and deadline."
      />
    </PageContainer>
  )
}
