import type { TaskWithUsers, PublicUser } from '../types'
import type {
  CreateTaskInput,
  UpdateTaskInput,
  UpdateStatusInput,
} from '@/server/tasks/schemas'

/**
 * Typed fetch wrappers for the dashboard's mutations + reads.
 *
 * These call the same API routes as the 11Labs voice agent does — the
 * difference is that the dashboard relies on the NextAuth session cookie
 * (sent automatically because of `credentials: 'include'`) instead of an
 * `x-api-key` header.
 *
 * Errors: every helper throws a typed `ApiClientError` on non-2xx responses
 * so callers can `try/catch` and surface a toast.
 */

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
    public issues?: unknown,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function request<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
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
      // ignore JSON parse failures — server may have returned non-JSON
    }
    throw new ApiClientError(
      res.status,
      payload.code,
      payload.error ?? `Request failed with status ${res.status}`,
      payload.issues,
    )
  }

  // 204 No Content
  if (res.status === 204) return undefined as T
  const json = (await res.json()) as { data: T }
  return json.data
}

function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const v of value) sp.append(key, String(v))
    } else {
      sp.set(key, String(value))
    }
  }
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

export const tasksApi = {
  list: (filters?: {
    search?: string
    status?: string | string[]
    priority?: string | string[]
    assignedToId?: string
    limit?: number
  }) =>
    request<TaskWithUsers[]>(
      `/api/tasks${buildQuery(filters ?? {})}`,
      { method: 'GET' },
    ),

  create: (input: CreateTaskInput) =>
    request<TaskWithUsers>(`/api/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateTaskInput) =>
    request<TaskWithUsers>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  updateStatus: (id: string, input: UpdateStatusInput) =>
    request<TaskWithUsers>(`/api/tasks/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<{ ok: true }>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}

export const usersApi = {
  list: (filters?: { phone?: string; search?: string; role?: string; limit?: number }) =>
    request<PublicUser[]>(
      `/api/users${buildQuery(filters ?? {})}`,
      { method: 'GET' },
    ),
}
