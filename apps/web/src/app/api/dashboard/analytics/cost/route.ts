import { NextRequest } from 'next/server'
import { jsonError } from '@/lib/api-auth'
import { getCostAnalytics } from '@/lib/dashboard/analytics'
import { authAndRange } from '../_shared'

export async function GET(req: NextRequest) {
  try {
    const { range } = await authAndRange(req)
    const data = await getCostAnalytics(range)
    return Response.json({ data })
  } catch (error) {
    return jsonError(error)
  }
}
