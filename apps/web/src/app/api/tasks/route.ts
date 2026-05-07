import { NextRequest } from 'next/server'
import { requireApiAuth, jsonError } from '@/lib/api-auth'
import { listTasks, createTask } from '@/server/tasks/service'

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    const tasks = await listTasks(
      ctx,
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data: tasks })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    const body = await req.json()
    const task = await createTask(ctx, body)
    return Response.json({ data: task }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
