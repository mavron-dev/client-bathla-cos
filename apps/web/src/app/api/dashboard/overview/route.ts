import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getOverview } from '@/lib/dashboard/queries'

/**
 * Home dashboard overview. Admin/dev session only — agents (api-key) have no
 * business hitting an aggregate analytics surface. Server components can also
 * call `getOverview()` directly without going through HTTP.
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
        'Dashboard analytics is admin/developer only',
      )
    }

    const data = await getOverview()
    // Add the caller's first name here — keeping it out of the SQL layer so
    // the query module stays auth-agnostic.
    const firstName = (ctx.email || 'there').split('@')[0]
    return Response.json({
      data: {
        ...data,
        greeting: { ...data.greeting, firstName },
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}
