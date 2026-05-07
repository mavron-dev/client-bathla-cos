import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth'
import type { UserRole } from '@bathla-cos/database'

/**
 * Discriminated union representing the resolved caller of an API route or
 * service function. `session` callers come from a NextAuth cookie (the
 * dashboard); `apiKey` callers come from the `x-api-key` header (the 11Labs
 * voice agent or any other trusted external integration).
 */
export type AuthContext =
  | {
      kind: 'session'
      userId: string
      role: UserRole
      teamId: string | null
      email: string
    }
  | { kind: 'apiKey'; scope: 'agent' }

export type ApiErrorCode =
  | 'API_AUTH_NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'NOT_AUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CONFLICT'

export class ApiAuthError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409,
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ApiAuthError'
  }
}

/**
 * Resolve the request's caller into an `AuthContext`.
 *
 * Order:
 *   1. If `x-api-key` header is present, verify it (constant-time compare)
 *      against `AGENT_API_KEY` and return an apiKey context. We intentionally
 *      do not fall back to the session in this branch — a bad header should
 *      fail fast, not silently switch to cookie auth.
 *   2. Otherwise fall back to the NextAuth session.
 */
export async function requireApiAuth(req: NextRequest): Promise<AuthContext> {
  const apiKey = req.headers.get('x-api-key')

  if (apiKey) {
    const expected = process.env.AGENT_API_KEY
    if (!expected) {
      console.error('[api-auth] AGENT_API_KEY env var is not set')
      throw new ApiAuthError(
        401,
        'API_AUTH_NOT_CONFIGURED',
        'API key auth not configured',
      )
    }
    const a = Buffer.from(apiKey)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ApiAuthError(401, 'INVALID_API_KEY', 'Invalid API key')
    }
    return { kind: 'apiKey', scope: 'agent' }
  }

  const session = await auth()
  if (!session?.user?.id || !session.user.role) {
    throw new ApiAuthError(401, 'NOT_AUTHENTICATED', 'Not authenticated')
  }
  return {
    kind: 'session',
    userId: session.user.id,
    role: session.user.role,
    teamId: session.user.teamId ?? null,
    email: session.user.email!,
  }
}

/**
 * Convert any thrown error into a JSON Response with the right status code.
 * Use as: `try { … } catch (error) { return jsonError(error) }`
 */
export function jsonError(error: unknown): Response {
  if (error instanceof ApiAuthError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status },
    )
  }
  if (error instanceof ZodError) {
    return Response.json(
      { error: 'Validation failed', code: 'BAD_REQUEST', issues: error.issues },
      { status: 400 },
    )
  }
  console.error('[api]', error)
  return Response.json(
    { error: 'Internal server error', code: 'INTERNAL' },
    { status: 500 },
  )
}

/**
 * Helper: is this caller allowed to perform admin-level operations?
 * (admin, developer, OR an api-key caller.)
 */
export function isAdminish(ctx: AuthContext): boolean {
  return (
    ctx.kind === 'apiKey' ||
    (ctx.kind === 'session' && (ctx.role === 'admin' || ctx.role === 'developer'))
  )
}

/**
 * Helper: derive the actor id + source for audit logs based on who is calling.
 *   - session → real user id, source='dashboard'
 *   - apiKey  → null id, source='agent'
 */
export function actorAttribution(
  ctx: AuthContext,
): { actorId: string | null; source: 'dashboard' | 'agent' } {
  return ctx.kind === 'session'
    ? { actorId: ctx.userId, source: 'dashboard' }
    : { actorId: null, source: 'agent' }
}

/**
 * Build a session-typed `AuthContext` from a NextAuth session. Used by server
 * components that already have a session in hand (e.g. dashboard `page.tsx`)
 * and want to call services directly without going through HTTP.
 *
 * The session passed in must already be auth-gated (e.g. via
 * `requireAdminOrDev()` / `requireExecutive()`); this helper assumes
 * `session.user.id` and `session.user.role` are set.
 */
export function sessionAuthContext(session: {
  user: {
    id: string
    role: UserRole
    teamId?: string | null
    email?: string | null
  }
}): AuthContext {
  return {
    kind: 'session',
    userId: session.user.id,
    role: session.user.role,
    teamId: session.user.teamId ?? null,
    email: session.user.email ?? '',
  }
}
