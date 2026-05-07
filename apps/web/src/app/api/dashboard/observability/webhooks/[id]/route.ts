import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getWebhookAuditDetail } from '@/lib/dashboard/observability'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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
    const data = await getWebhookAuditDetail(id)
    if (!data) throw new ApiAuthError(404, 'NOT_FOUND', 'Audit row not found')
    return Response.json({ data })
  } catch (error) {
    return jsonError(error)
  }
}
