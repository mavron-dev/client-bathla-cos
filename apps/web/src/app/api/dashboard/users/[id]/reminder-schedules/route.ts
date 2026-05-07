import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  jsonError,
  ApiAuthError,
} from '@/lib/api-auth'
import {
  getReminderSchedules,
  upsertReminderSchedules,
} from '@/lib/dashboard/users'

type Params = { params: Promise<{ id: string }> }

/**
 * Reminder schedule per user.
 *   - GET: any session that admin/dev OR self.
 *   - PATCH: admin/dev only — schedule changes can affect outbound WhatsApp
 *     traffic, so we don't let users (even self) toggle them in this round.
 *
 * The agent (api-key) has no business reading or writing schedules from here.
 */
function gateRead(ctx: Awaited<ReturnType<typeof requireApiAuth>>, id: string) {
  if (ctx.kind === 'apiKey') {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Agents cannot access reminder schedules',
    )
  }
  if (ctx.role !== 'admin' && ctx.role !== 'developer' && ctx.userId !== id) {
    throw new ApiAuthError(403, 'FORBIDDEN', 'Insufficient permissions')
  }
}

function gateWrite(ctx: Awaited<ReturnType<typeof requireApiAuth>>) {
  if (
    ctx.kind !== 'session' ||
    (ctx.role !== 'admin' && ctx.role !== 'developer')
  ) {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Only admin or developer can edit reminder schedules',
    )
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    gateRead(ctx, id)
    const data = await getReminderSchedules(id)
    return Response.json({ data })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const ctx = await requireApiAuth(req)
    gateWrite(ctx)
    const body = await req.json()
    const data = await upsertReminderSchedules(id, body)
    return Response.json({ data })
  } catch (error) {
    return jsonError(error)
  }
}
