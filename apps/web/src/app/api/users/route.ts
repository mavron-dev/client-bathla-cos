import { NextRequest } from 'next/server'
import { requireApiAuth, jsonError } from '@/lib/api-auth'
import { listUsers, createUser } from '@/server/users/service'

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    const users = await listUsers(
      ctx,
      Object.fromEntries(req.nextUrl.searchParams),
    )
    return Response.json({ data: users })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireApiAuth(req)
    const body = await req.json()
    const user = await createUser(ctx, body)
    return Response.json({ data: user }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
