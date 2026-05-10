import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getJobDetail } from '@/lib/dashboard/jobs'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/dashboard/jobs/[id]
 * Admin/developer session only. Returns the full Job row including payload +
 * output JSON (the drawer relies on this for the JSONViewer).
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireApiAuth(req)
    if (
      ctx.kind !== 'session' ||
      (ctx.role !== 'admin' && ctx.role !== 'developer')
    ) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Jobs dashboard is admin/developer only')
    }
    const { id } = await params
    const job = await getJobDetail(id)
    if (!job) {
      throw new ApiAuthError(404, 'NOT_FOUND', 'Job not found')
    }
    return Response.json({ data: job })
  } catch (error) {
    return jsonError(error)
  }
}
