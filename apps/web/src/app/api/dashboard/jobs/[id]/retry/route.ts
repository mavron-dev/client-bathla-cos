import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { retryJob } from '@/lib/dashboard/jobs'

type Params = { params: Promise<{ id: string }> }

/**
 * POST /api/dashboard/jobs/[id]/retry
 *
 * Admin/developer session only — explicitly NOT api-key. Resets a
 * `failed`/`skipped` job to `pending` (worker picks it up next cycle).
 *
 * Idempotent: a double-clicked retry sees the second request return 409
 * because the WHERE clause refuses to act once status flips back.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const ctx = await requireApiAuth(req)
    if (
      ctx.kind !== 'session' ||
      (ctx.role !== 'admin' && ctx.role !== 'developer')
    ) {
      throw new ApiAuthError(403, 'FORBIDDEN', 'Only admin/developer can retry jobs')
    }
    const { id } = await params
    const result = await retryJob(id)
    return Response.json({ data: result })
  } catch (error) {
    return jsonError(error)
  }
}
