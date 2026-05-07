'use client'

import * as React from 'react'
import { useRegisterActions } from 'kbar'
import { useRouter } from 'next/navigation'

interface UserHit {
  id: string
  displayName: string
  phoneE164: string
  email: string
}

interface ConversationHit {
  id: string
  analysisTitle: string | null
  analysisSummary: string | null
  user: { displayName: string }
  startedAt: string
}

/**
 * Hydrates the cmd+k command palette with two dynamic action sources:
 *   - All admin users → "Open <name> profile" (fuzzy-matched on name + phone + email)
 *   - Recent conversations → "Open <title>" (fuzzy-matched on title + summary + user)
 *
 * Fetched once on mount via the admin/dev-only dashboard endpoints. Mounted
 * inside the admin layout so it only runs for authenticated admins. Failures
 * are silent — the static nav actions still work either way.
 */
export function KBarDynamicActions() {
  const router = useRouter()
  const [users, setUsers] = React.useState<UserHit[]>([])
  const [conversations, setConversations] = React.useState<ConversationHit[]>(
    [],
  )

  React.useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          fetch('/api/dashboard/users?status=all', {
            cache: 'no-store',
          }),
          fetch('/api/dashboard/conversations?limit=50', {
            cache: 'no-store',
          }),
        ])
        if (!cancelled) {
          if (uRes.ok) {
            const json = await uRes.json()
            setUsers(json.data ?? [])
          }
          if (cRes.ok) {
            const json = await cRes.json()
            setConversations(json.data?.data ?? [])
          }
        }
      } catch {
        // Cmd+K still works with just the nav actions on failure.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const userActions = React.useMemo(() => {
    return users.map((u) => ({
      id: `user-${u.id}`,
      name: u.displayName,
      keywords: `${u.displayName} ${u.email} ${u.phoneE164}`,
      section: 'Users',
      subtitle: u.phoneE164,
      perform: () => router.push(`/admin/users/${u.id}`),
    }))
  }, [users, router])

  const conversationActions = React.useMemo(() => {
    return conversations.map((c) => {
      const title = c.analysisTitle ?? 'Untitled conversation'
      // Keywords blob feeds the kbar fuzzy search — we widen it deliberately
      // so a query like "credit card" matches a conversation whose title is
      // "Task Update" but whose summary mentions credit card optimization.
      const summary = c.analysisSummary ?? ''
      return {
        id: `convo-${c.id}`,
        name: title,
        keywords: `${title} ${summary} ${c.user.displayName}`,
        section: 'Conversations',
        subtitle: c.user.displayName,
        perform: () => router.push(`/admin/conversations/${c.id}`),
      }
    })
  }, [conversations, router])

  // Single registration with the combined list — kbar dedupes on `id`.
  useRegisterActions(
    React.useMemo(
      () => [...userActions, ...conversationActions],
      [userActions, conversationActions],
    ),
    [userActions, conversationActions],
  )

  return null
}
