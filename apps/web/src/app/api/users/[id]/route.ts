import { NextRequest } from 'next/server'
import { requireApiAuth, jsonError } from '@/lib/api-auth'
import { getUser, updateUser, deactivateUser } from '@/server/users/service'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    const user = await getUser(ctx, id)
    return Response.json({ data: user })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    const body = await req.json()
    const user = await updateUser(ctx, id, body)
    return Response.json({ data: user })
  } catch (error) {
    return jsonError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    const result = await deactivateUser(ctx, id)
    return Response.json({ data: result })
  } catch (error) {
    return jsonError(error)
  }
}
