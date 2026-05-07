import PageContainer from '@/components/layout/page-container'

export default function ExecutiveDashboardPage() {
  return (
    <PageContainer scrollable>
      <div className="flex flex-1 flex-col space-y-4">
        <div className="flex items-center justify-between space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back 👋</h1>
        </div>
        <p className="text-muted-foreground">
          Executive dashboard placeholder. Your tasks and reminders surface here.
        </p>
      </div>
    </PageContainer>
  )
}
