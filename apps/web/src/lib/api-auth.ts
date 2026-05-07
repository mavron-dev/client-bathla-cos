import { NextRequest } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhoneE164, phoneLookupCandidates } from '@/lib/phone'
import type { User, UserRole } from '@bathla-cos/database'

/**
 * Discriminated union representing the resolved caller of an API route or
 * service function.
 *
 *   - `session`  — NextAuth cookie (the dashboard). RBAC follows the user's
 *                  role; admin/dev see everyone, executive sees themselves.
 *   - `apiKey`   — `x-api-key` header + a verified `x-caller-phone` header
 *                  bound by ElevenLabs to `{{system__caller_id}}` (i.e. the
 *                  messaging platform's verified caller id, NOT something the
 *                  LLM can fabricate). The phone is resolved to a User row
 *                  here, so by the time downstream code runs it has a real
 *                  user identity tied to the agent caller. Agent callers can
 *                  only access THEIR OWN data — see `assertCallerCanAccess`.
 */
export type AuthContext =
  | {
      kind: 'session'
      userId: string
      role: UserRole
      teamId: string | null
      email: string
    }
  | { kind: 'apiKey'; scope: 'agent'; caller: User }

export type ApiErrorCode =
  | 'API_AUTH_NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'NOT_AUTHENTICATED'
  | 'MISSING_CALLER_PHONE'
  | 'CALLER_NOT_RECOGNIZED'
  | 'CALLER_INACTIVE'
  | 'CALLER_MISMATCH'
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
 *      against `AGENT_API_KEY`. We intentionally do not fall back to the
 *      session in this branch — a bad header should fail fast, not silently
 *      switch to cookie auth. Then resolve `x-caller-phone` to a User row;
 *      missing or unrecognised phones fail closed.
 *   2. Otherwise fall back to the NextAuth session (dashboard).
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

    // Caller identity. Phone comes from ElevenLabs `system__caller_id` (which
    // the LLM cannot forge — it's set by the messaging platform's webhook
    // metadata, not the model layer). Without it we can't verify that the
    // request is acting on behalf of any particular user.
    const callerPhone = normalizePhoneE164(req.headers.get('x-caller-phone'))
    if (!callerPhone) {
      throw new ApiAuthError(
        401,
        'MISSING_CALLER_PHONE',
        'Agent requests must include x-caller-phone header',
      )
    }
    const caller = await prisma.user.findFirst({
      where: { phoneE164: { in: phoneLookupCandidates(callerPhone) } },
    })
    if (!caller) {
      throw new ApiAuthError(
        403,
        'CALLER_NOT_RECOGNIZED',
        'Caller phone is not registered',
      )
    }
    if (!caller.isActive) {
      throw new ApiAuthError(
        403,
        'CALLER_INACTIVE',
        'Caller account is paused',
      )
    }
    return { kind: 'apiKey', scope: 'agent', caller }
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
    // Log blocked agent caller mismatches for forensics — never include the
    // api-key or phone, just the error code so we can grep prod logs.
    if (error.code === 'CALLER_MISMATCH' || error.code === 'CALLER_NOT_RECOGNIZED') {
      console.warn('[api-auth] blocked agent request', { code: error.code })
    }
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
 * Single chokepoint that route handlers call before doing anything user-scoped.
 * Throws `ApiAuthError` (which `jsonError` maps to the right HTTP envelope) on
 * any mismatch.
 *
 *   - Session: admin/dev see everyone; everyone else only themselves.
 *   - Agent  : caller can ONLY access their own data, no exceptions in
 *              Phase 1. (Phase 2 will introduce an admin override via an
 *              explicit `x-target-user-id` header — design notes in the spec.)
 *
 * Use this AFTER `requireApiAuth` and AFTER you've resolved the request's
 * target user id (path param, body field, or task.assignedToId via
 * `getTaskAssignee`).
 */
export function assertCallerCanAccess(
  ctx: AuthContext,
  targetUserId: string,
): void {
  if (ctx.kind === 'session') {
    if (ctx.role === 'admin' || ctx.role === 'developer') return
    if (ctx.userId === targetUserId) return
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'You can only access your own data',
    )
  }
  if (ctx.caller.id === targetUserId) return
  throw new ApiAuthError(
    403,
    'CALLER_MISMATCH',
    'Caller is not authorized for this resource',
  )
}

/**
 * Helper: derive the actor id + source for audit logs based on who is calling.
 *   - session → real user id, source='dashboard'
 *   - apiKey  → caller user id, source='agent' (the verified phone owner)
 *
 * Note: prior to caller verification we used `null` here for agent calls
 * because there was no way to know who the agent was acting for. With the
 * verified caller in ctx, the audit log can now attribute agent-driven changes
 * to the real user — every TaskUpdate row the agent writes carries the
 * caller's id and `source='agent'`.
 */
export function actorAttribution(
  ctx: AuthContext,
): { actorId: string | null; source: 'dashboard' | 'agent' } {
  return ctx.kind === 'session'
    ? { actorId: ctx.userId, source: 'dashboard' }
    : { actorId: ctx.caller.id, source: 'agent' }
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
