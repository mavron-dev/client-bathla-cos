import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import { listConversations } from '@/lib/dashboard/conversations'

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
        'Conversations dashboard is admin/developer only',
      )
    }
    const result = await listConversations(
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data: result })
  } catch (error) {
    return jsonError(error)
  }
}
