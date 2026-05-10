import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { listJobs } from '@/lib/dashboard/jobs'

/**
 * GET /api/dashboard/jobs
 * Admin/developer session only. Returns a paginated list of Job rows with
 * batched user resolution. Filters: type[], status[], userId, from, to,
 * search, page, limit. See `lib/dashboard/jobs.ts` for the schema.
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

    // Manually unfold multi-value query params (URLSearchParams.getAll) so the
    // service-layer Zod schema sees real arrays for `type`/`status`.
    const sp = req.nextUrl.searchParams
    const raw: Record<string, string | string[]> = {}
    for (const key of new Set(sp.keys())) {
      const all = sp.getAll(key)
      raw[key] = all.length > 1 ? all : all[0]!
    }
    const result = await listJobs(raw)
    return Response.json({ data: result })
  } catch (error) {
    return jsonError(error)
  }
}
