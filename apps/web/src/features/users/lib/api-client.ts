import type { PublicUser, UserProfilePayload } from '../types'
import type {
  CreateUserInput,
  UserAdminUpdateInput,
  UserPrefsInput,
} from '@/server/users/schemas'

/**
 * Typed fetch wrappers used by the dashboard's client components. Calls go to
 * the same `/api/users/*` routes the 11Labs voice agent uses; the dashboard
 * just relies on its NextAuth cookie (`credentials: 'include'`) instead of an
 * `x-api-key` header.
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
      // ignore non-JSON error bodies
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

export const usersApi = {
  list: (filters?: {
    phone?: string
    search?: string
    role?: string
    status?: 'active' | 'inactive' | 'all'
    limit?: number
  }) =>
    request<PublicUser[]>(
      `/api/users${buildQuery(filters ?? {})}`,
      { method: 'GET' },
    ),

  get: (id: string) =>
    request<PublicUser>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'GET',
    }),

  profile: (id: string) =>
    request<UserProfilePayload>(
      `/api/users/${encodeURIComponent(id)}/profile`,
      { method: 'GET' },
    ),

  create: (input: CreateUserInput) =>
    request<PublicUser>(`/api/users`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  // Used by admin/dev callers: full update surface.
  update: (id: string, input: UserAdminUpdateInput) =>
    request<PublicUser>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  // Used by self / agent: preferences only. Same endpoint, narrower body.
  updatePrefs: (id: string, input: UserPrefsInput) =>
    request<PublicUser>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deactivate: (id: string) =>
    request<{ ok: true }>(`/api/users/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
}
