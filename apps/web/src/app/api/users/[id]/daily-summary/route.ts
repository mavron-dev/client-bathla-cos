import { NextRequest } from 'next/server'
import { requireApiAuth, jsonError } from '@/lib/api-auth'
import { getUserDailySummary } from '@/server/users/service'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    const summary = await getUserDailySummary(
      ctx,
      id,
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data: summary })
  } catch (error) {
    return jsonError(error)
  }
}
