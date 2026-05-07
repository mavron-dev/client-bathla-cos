import { NextRequest } from 'next/server'
import {
  requireApiAuth,
  ApiAuthError,
  type AuthContext,
} from '@/lib/api-auth'
import { rangeFromPreset, type AnalyticsRange } from '@/lib/dashboard/analytics'

/**
 * Shared admin/dev gate + range parsing for the analytics endpoints.
 * Accepts either:
 *   - explicit `from` + `to` ISO timestamps, OR
 *   - a `range` preset (`7d` | `30d` | `90d`).
 * Defaults to `30d` if neither is supplied.
 */
export async function authAndRange(
  req: NextRequest,
): Promise<{ ctx: AuthContext; range: AnalyticsRange }> {
  const ctx = await requireApiAuth(req)
  if (
    ctx.kind !== 'session' ||
    (ctx.role !== 'admin' && ctx.role !== 'developer')
  ) {
    throw new ApiAuthError(
      403,
      'FORBIDDEN',
      'Analytics is admin/developer only',
    )
  }

  const sp = req.nextUrl.searchParams
  const fromRaw = sp.get('from')
  const toRaw = sp.get('to')
  if (fromRaw && toRaw) {
    const from = new Date(fromRaw)
    const to = new Date(toRaw)
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { ctx, range: { from, to } }
    }
    throw new ApiAuthError(
      400,
      'BAD_REQUEST',
      'Invalid `from` or `to` ISO timestamp',
    )
  }
  const preset = sp.get('range') ?? '30d'
  return { ctx, range: rangeFromPreset(preset) }
}
