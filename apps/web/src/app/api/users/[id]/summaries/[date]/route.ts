import { NextRequest } from 'next/server'
import { requireApiAuth, jsonError } from '@/lib/api-auth'
import { recallDay } from '@/server/users/service'

type Params = { params: Promise<{ id: string; date: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id, date } = await params
    const ctx = await requireApiAuth(req)
    const result = await recallDay(ctx, id, date)
    return Response.json({ data: result })
  } catch (error) {
    return jsonError(error)
  }
}
