import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getJobStats } from '@/lib/dashboard/jobs'

/**
 * GET /api/dashboard/jobs/stats
 * Admin/developer session only. Returns the 4 KPI counters powering the
 * Jobs page header (pending, running, failed_24h, success_rate_24h).
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    if (
      ctx.kind !== 'session' ||
      (ctx.role !== 'admin' && ctx.role !== 'developer')
    ) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Jobs dashboard is admin/developer only')
    }
    const stats = await getJobStats()
    return Response.json({ data: stats })
  } catch (error) {
    return jsonError(error)
  }
}
