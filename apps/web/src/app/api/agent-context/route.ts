import { NextRequest } from 'next/server'
import { requireApiAuth, jsonError } from '@/lib/api-auth'
import { getAgentContext } from '@/server/users/service'

/**
 * Agent bootstrap endpoint. Single shot: phone → resolved user + task state +
 * recent ConversationSummary rows + current_local_time. The 11Labs server
 * tool maps `system__caller_id` to `?phone=…` here.
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    const context = await getAgentContext(
      ctx,
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data: context })
  } catch (error) {
    return jsonError(error)
  }
}
