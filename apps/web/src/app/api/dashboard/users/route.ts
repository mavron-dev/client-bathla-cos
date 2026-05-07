import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getUsersWithStats } from '@/lib/dashboard/users'

/**
 * Dashboard-side users listing with 30d stats. Admin/dev only — agents
 * already have a separate list endpoint at `/api/users` that returns the
 * thinner `userPublic` selector.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    if (
      ctx.kind !== 'session' ||
      (ctx.role !== 'admin' && ctx.role !== 'developer')
    ) {
      throw new ApiAuthError(
        403,
        'FORBIDDEN',
        'Dashboard users list is admin/developer only',
      )
    }
    const data = await getUsersWithStats(
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data })
  } catch (error) {
    return jsonError(error)
  }
}
