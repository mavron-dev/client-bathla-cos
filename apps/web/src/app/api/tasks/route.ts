import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  assertCallerCanAccess,
  ApiAuthError,
} from '@/lib/api-auth'
import { listTasks, createTask } from '@/server/tasks/service'

/**
 * GET — list tasks. Agent callers must pass `assignedToId` in the query so we
 * can verify it matches the resolved caller. (Without it, an agent listing
 * "all tasks" would leak other users' rows.)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    const params = Object.fromEntries(req.nextUrl.searchParams)

    if (ctx.kind === 'apiKey') {
      const target = params.assignedToId
      if (!target || typeof target !== 'string') {
        throw new ApiAuthError(
          400,
          'BAD_REQUEST',
          'assignedToId is required for agent callers',
        )
      }
      assertCallerCanAccess(ctx, target)
    }

    const tasks = await listTasks(ctx, params)
    return Response.json({ data: tasks })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    const body = await req.json()
    if (ctx.kind === 'apiKey') {
      const target = body?.assignedToId
      if (typeof target !== 'string') {
        throw new ApiAuthError(
          400,
          'BAD_REQUEST',
          'assignedToId is required',
        )
      }
      assertCallerCanAccess(ctx, target)
    }
    const task = await createTask(ctx, body)
    return Response.json({ data: task }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
