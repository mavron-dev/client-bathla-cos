import PageContainer from '@/components/layout/page-container'

export default function AdminDashboardPage() {
  return (
    <PageContainer scrollable>
      <div className="flex flex-1 flex-col space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Hi, welcome to Butler 👋</h1>
        </div>
        <p className="text-muted-foreground">
          Admin dashboard placeholder. Tasks, reminders, jobs, and observability surface here.
        </p>
      </div>
    </PageContainer>
  )
}
