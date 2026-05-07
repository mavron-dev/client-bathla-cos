import PageContainer from '@/components/layout/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { listConversations } from '@/lib/dashboard/conversations'
import { ConversationsFilterBar } from '@/features/conversations/components/conversations-filter-bar'
import { ConversationsTable } from '@/features/conversations/components/conversations-table'
import { ConversationsPagination } from '@/features/conversations/components/conversations-pagination'

export const dynamic = 'force-dynamic'

type SearchParams = {
  search?: string
  success?: string
  channel?: string
  language?: string
  userId?: string
  page?: string
}

export default async function ConversationsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const result = await listConversations({
    ...params,
    // listConversations defaults limit=25 for us
  })

  // Build a base URLSearchParams (sans `page`) for the pagination links.
  const base = new URLSearchParams()
  if (params.search) base.set('search', params.search)
  if (params.success) base.set('success', params.success)
  if (params.channel) base.set('channel', params.channel)
  if (params.language) base.set('language', params.language)
  if (params.userId) base.set('userId', params.userId)

  return (
    <PageContainer scrollable>
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 pb-6 pt-2 lg:px-6">
        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              Conversations
            </h1>
            <p className="text-muted-foreground text-sm">
              Browse, filter, and drill into every WhatsApp + dashboard
              session.
            </p>
          </div>
        </div>

        <ConversationsFilterBar />

        <Card>
          <CardContent className="p-0">
            <ConversationsTable conversations={result.data} />
          </CardContent>
        </Card>

        {result.total > 0 && (
          <ConversationsPagination
            page={result.page}
            limit={result.limit}
            total={result.total}
            baseSearchParams={base}
          />
        )}
      </div>
    </PageContainer>
  )
}
