import { prisma } from '@/lib/prisma'
import { normalizePhoneE164, phoneLookupCandidates } from '@/lib/phone'
import type { PostCallTranscriptionData } from '@/lib/elevenlabs/types'

/**
 * Resolves a User from a `post_call_transcription` payload.
 *
 * Tier order (first match wins):
 *   1. `dynamic_variables.user_id` (UUID) — cleanest path, but only flows
 *      when the conversation initiation webhook is wired to inject it. Not
 *      used today; kept first so it takes precedence the moment it lights up.
 *   2. `metadata.whatsapp.whatsapp_user_id` — canonical WhatsApp path. The
 *      user's phone in digits-only form (e.g. "919958841734").
 *   3. `data.user_id` — for WhatsApp this arrives as the user's phone in
 *      digits-only form too, NOT a UUID. Try UUID first; if that doesn't
 *      shape-match, fall back to phone normalization.
 *   4. `metadata.phone_call.external_number` — telephony fallback (Twilio /
 *      SIP). Always `null` for WhatsApp; documented for future channels.
 *
 * Phone lookups go through `phoneLookupCandidates` so seeded rows stored as
 * bare digits ("919958841734") match alongside `+`-prefixed rows. Same
 * helper as `requireApiAuth` uses — single source of truth for normalization.
 *
 * Returns `null` if no path resolves. The caller maps that to a 200 with
 * `processingStatus='orphaned'` so we never lose payloads to a 500.
 */
export interface ResolvedUser {
  id: string
  phoneE164: string
  displayName: string
  isActive: boolean
  resolvedVia:
    | 'dynamic_variable_user_id'
    | 'whatsapp_user_id'
    | 'top_level_user_id'
    | 'top_level_user_id_as_phone'
    | 'phone_call_external_number'
}

const userPick = {
  id: true,
  phoneE164: true,
  displayName: true,
  isActive: true,
} as const

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: userPick })
}

async function findByPhone(rawPhone: string) {
  const normalized = normalizePhoneE164(rawPhone)
  if (!normalized) return null
  return prisma.user.findFirst({
    where: { phoneE164: { in: phoneLookupCandidates(normalized) } },
    select: userPick,
  })
}

export async function resolveUserFromTranscription(
  data: PostCallTranscriptionData,
): Promise<ResolvedUser | null> {
  // Tier 1: dynamic_variables.user_id (UUID)
  const dyn =
    data.conversation_initiation_client_data?.dynamic_variables?.user_id
  if (typeof dyn === 'string' && UUID_RE.test(dyn)) {
    const u = await findById(dyn)
    if (u) return { ...u, resolvedVia: 'dynamic_variable_user_id' }
  }

  // Tier 2: WhatsApp user phone (canonical for inbound WhatsApp)
  const waPhone = data.metadata?.whatsapp?.whatsapp_user_id
  if (typeof waPhone === 'string' && waPhone.length > 0) {
    const u = await findByPhone(waPhone)
    if (u) return { ...u, resolvedVia: 'whatsapp_user_id' }
  }

  // Tier 3: top-level user_id — UUID OR digits-only phone
  if (typeof data.user_id === 'string' && data.user_id.length > 0) {
    if (UUID_RE.test(data.user_id)) {
      const u = await findById(data.user_id)
      if (u) return { ...u, resolvedVia: 'top_level_user_id' }
    } else {
      const u = await findByPhone(data.user_id)
      if (u) return { ...u, resolvedVia: 'top_level_user_id_as_phone' }
    }
  }

  // Tier 4: telephony fallback (Twilio / SIP — never fires for WhatsApp)
  const tel = data.metadata?.phone_call?.external_number
  if (typeof tel === 'string' && tel.length > 0) {
    const u = await findByPhone(tel)
    if (u) return { ...u, resolvedVia: 'phone_call_external_number' }
  }

  return null
}
