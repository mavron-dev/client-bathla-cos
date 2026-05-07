import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { getConversationDetail } from '@/lib/dashboard/conversations'

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
        'Conversation detail is admin/developer only',
      )
    }
    const detail = await getConversationDetail(id)
    if (!detail) {
      throw new ApiAuthError(404, 'NOT_FOUND', 'Conversation not found')
    }
    return Response.json({ data: detail })
  } catch (error) {
    return jsonError(error)
  }
}
