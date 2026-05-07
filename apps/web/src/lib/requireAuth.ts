import { auth } from '@/lib/auth'
import { UserRole } from '@bathla-cos/database'

/**
 * Custom error class for authentication / authorization failures.
 */
export class AuthError extends Error {
  constructor(
    public code: 'UNAUTHORIZED' | 'FORBIDDEN',
    message: string,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * Fail-closed authorization helper.
 *
 * @param allowedRoles - if omitted, any authenticated user passes
 * @returns the session object on success
 * @throws AuthError on missing session, missing role, or wrong role
 */
export async function requireAuth(allowedRoles?: UserRole[]) {
  const session = await auth()

  if (!session?.user) {
    console.warn('[AUTH] Denied: No session')
    throw new AuthError('UNAUTHORIZED', 'Authentication required')
  }

  const role = session.user.role
  if (!role) {
    console.warn(`[AUTH] Denied: No role for ${session.user.email}`)
    throw new AuthError('FORBIDDEN', 'Role not assigned')
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    console.warn(
      `[AUTH] Denied: ${session.user.email} (${role}) not in [${allowedRoles.join(', ')}]`,
    )
    throw new AuthError('FORBIDDEN', 'Insufficient permissions')
  }

  return session
}

// ------- Convenience helpers (Bathla COS role groupings) ----------

/** admin only — write operations on admin-owned data. */
export const requireAdmin = () => requireAuth(['admin'])

/** admin + developer — read/write across the platform. */
export const requireAdminOrDev = () => requireAuth(['admin', 'developer'])

/** any non-admin org user (executives + ICs). */
export const requireExecutive = () => requireAuth(['director', 'manager', 'member'])

/** any authenticated user with a role. */
export const requireAnyRole = () => requireAuth()

// ------- Server-action error formatter ----------

/**
 * Wraps an unknown error into a structured response if it's an AuthError.
 * Returns null if it isn't — the caller is responsible for other error kinds.
 */
export function handleAuthError(
  error: unknown,
): { success: false; error: string } | null {
  if (error instanceof AuthError) {
    return {
      success: false,
      error:
        error.code === 'UNAUTHORIZED'
          ? 'Please log in to continue'
          : 'You do not have permission to perform this action',
    }
  }
  return null
}
