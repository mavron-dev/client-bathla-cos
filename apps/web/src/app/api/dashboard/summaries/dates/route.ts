import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { listSummaryDates } from '@/lib/dashboard/summaries'

/**
 * GET /api/dashboard/summaries/dates?userId=&days=&tz=
 * Admin/developer session only. Returns the trailing N-day window for the
 * given user, annotated with hasSummary / decisionCount / emotionalTone for
 * the date rail.
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
    const items = await listSummaryDates(
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data: items })
  } catch (error) {
    return jsonError(error)
  }
}
