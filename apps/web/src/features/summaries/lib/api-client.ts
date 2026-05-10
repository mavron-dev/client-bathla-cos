import type {
  ConversationSummaryDetail,
  SummaryDateRailItem,
} from '@/lib/dashboard/summaries'
import { ApiClientError } from '@/features/tasks/lib/api-client'

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    ...init,
  })
  if (!res.ok) {
    let payload: { error?: string; code?: string; issues?: unknown } = {}
    try {
      payload = await res.json()
    } catch {
      // ignore
    }
    throw new ApiClientError(
      res.status,
      payload.code,
      payload.error ?? `Request failed with status ${res.status}`,
      payload.issues,
    )
  }
  if (res.status === 204) return undefined as T
  const json = (await res.json()) as { data: T }
  return json.data
}

export const summariesApi = {
  listDates: (params: { userId: string; days?: number; tz?: string }) => {
    const sp = new URLSearchParams()
    sp.set('userId', params.userId)
    if (params.days) sp.set('days', String(params.days))
    if (params.tz) sp.set('tz', params.tz)
    return request<SummaryDateRailItem[]>(
      `/api/dashboard/summaries/dates?${sp.toString()}`,
      { method: 'GET' },
    )
  },
  getDaily: (params: { userId: string; date: string }) => {
    const sp = new URLSearchParams(params)
    return request<ConversationSummaryDetail | null>(
      `/api/dashboard/summaries?${sp.toString()}`,
      { method: 'GET' },
    )
  },
}
