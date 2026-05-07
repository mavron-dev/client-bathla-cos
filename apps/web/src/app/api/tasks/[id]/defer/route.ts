import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  assertCallerCanAccess,
} from '@/lib/api-auth'
import { deferTask, getTaskAssignee } from '@/server/tasks/service'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    if (ctx.kind === 'apiKey') {
      const assignee = await getTaskAssignee(id)
      assertCallerCanAccess(ctx, assignee)
    }
    const body = await req.json()
    const task = await deferTask(ctx, id, body)
    return Response.json({ data: task })
  } catch (error) {
    return jsonError(error)
  }
}
