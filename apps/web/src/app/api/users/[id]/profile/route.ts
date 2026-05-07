import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  assertCallerCanAccess,
} from '@/lib/api-auth'
import { getUserProfile } from '@/server/users/service'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    assertCallerCanAccess(ctx, id)
    const profile = await getUserProfile(ctx, id)
    return Response.json({ data: profile })
  } catch (error) {
    return jsonError(error)
  }
}
