/**
 * Single source of truth for phone normalization.
 *
 * Why this lives in one file: the agent's `x-caller-phone` header (bound to
 * ElevenLabs `system__caller_id`) and the User row's `phoneE164` column may
 * differ in spacing, leading `+`, or formatting depending on the upstream
 * channel (WhatsApp Cloud, Twilio, etc). Two divergent normalizers in two
 * places is exactly how phone-based auth bugs are born — keep all callers
 * pointed here.
 */
export function normalizePhoneE164(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  return `+${digits}`
}

/**
 * Build the OR-tuple Prisma needs to look up a User row regardless of whether
 * its `phoneE164` column was seeded with the leading `+`. Pairs with the
 * existing pattern in `getAgentContext` / `listUsers`.
 */
export function phoneLookupCandidates(normalized: string): string[] {
  const stripped = normalized.replace(/^\+/, '')
  return [stripped, `+${stripped}`]
}
