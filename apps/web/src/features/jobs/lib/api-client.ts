import type { JobDetailPayload, RetryResult } from '@/lib/dashboard/jobs'
import { ApiClientError } from '@/features/tasks/lib/api-client'

/**
 * Typed fetch helpers for the Jobs page client islands (drawer + retry).
 * Reuses `ApiClientError` from the tasks feature so toasts / error handling
 * line up with the rest of the dashboard.
 */
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

export const jobsApi = {
  get: (id: string) =>
    request<JobDetailPayload>(`/api/dashboard/jobs/${encodeURIComponent(id)}`, {
      method: 'GET',
    }),
  retry: (id: string) =>
    request<RetryResult>(
      `/api/dashboard/jobs/${encodeURIComponent(id)}/retry`,
      { method: 'POST' },
    ),
}
