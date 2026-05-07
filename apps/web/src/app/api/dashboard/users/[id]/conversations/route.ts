import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getUserActivity } from '@/lib/dashboard/users'

type Params = { params: Promise<{ id: string }> }

/**
 * Compact recent-conversations list scoped to one user. Used by the user
 * detail page's Activity tab. Re-uses `getUserActivity` and exposes its
 * `recentConversations` slice.
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    if (
      ctx.kind !== 'session' ||
      (ctx.role !== 'admin' &&
        ctx.role !== 'developer' &&
        ctx.userId !== id)
    ) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Insufficient permissions')
    }
    const days = Number(req.nextUrl.searchParams.get('days') ?? 30) || 30
    const activity = await getUserActivity(id, days)
    return Response.json({
      data: {
        recentConversations: activity.recentConversations,
        kpis: activity.kpis,
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}
