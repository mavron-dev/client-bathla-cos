import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getDailySummary } from '@/lib/dashboard/summaries'

/**
 * GET /api/dashboard/summaries?userId=&date=YYYY-MM-DD
 * Admin/developer session only. Returns the full ConversationSummary row for
 * (userId, date), or `null` when the user has no summary on that date.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    if (
      ctx.kind !== 'session' ||
      (ctx.role !== 'admin' && ctx.role !== 'developer')
    ) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Summaries dashboard is admin/developer only')
    }
    const detail = await getDailySummary(
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data: detail })
  } catch (error) {
    return jsonError(error)
  }
}
