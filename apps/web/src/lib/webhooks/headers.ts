import type { NextRequest } from 'next/server'

/**
 * Whitelist of headers worth snapshotting into the audit row. Keep this
 * narrow on purpose: cookies, auth tokens, and other sensitive headers MUST
 * NOT land in the audit table. When debugging a delivery, these are the only
 * fields we usually care about.
 */
const HEADERS_OF_INTEREST = [
  'elevenlabs-signature',
  'content-type',
  'user-agent',
  'transfer-encoding',
  'x-forwarded-for',
  'x-real-ip',
] as const

export function snapshotHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of HEADERS_OF_INTEREST) {
    const v = req.headers.get(k)
    if (v) out[k] = v
  }
  return out
}
