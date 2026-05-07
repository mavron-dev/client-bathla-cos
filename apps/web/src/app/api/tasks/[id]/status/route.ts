import { NextRequest } from 'next/server'
import { requireApiAuth, jsonError } from '@/lib/api-auth'
import { updateTaskStatus } from '@/server/tasks/service'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    const body = await req.json()
    const task = await updateTaskStatus(ctx, id, body)
    return Response.json({ data: task })
  } catch (error) {
    return jsonError(error)
  }
}
