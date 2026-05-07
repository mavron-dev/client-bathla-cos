import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getObservabilityHealth } from '@/lib/dashboard/observability'

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
        'Observability is admin/developer only',
      )
    }
    const data = await getObservabilityHealth()
    return Response.json({ data })
  } catch (error) {
    return jsonError(error)
  }
}
