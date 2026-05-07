import { prisma } from '@/lib/prisma'
import { normalizePhoneE164, phoneLookupCandidates } from '@/lib/phone'
import type { PostCallTranscriptionData } from '@/lib/elevenlabs/types'

/**
 * Resolves a User from a `post_call_transcription` payload. We try in order:
 *
 *   1. `data.user_id` — set when the agent passed our internal user_id as a
 *      dynamic variable on conversation start. This is the cleanest path.
 *   2. `data.conversation_initiation_client_data.dynamic_variables.user_id`
 *      — same intent, different position in the payload depending on how
 *      ElevenLabs renders it. We check both to be defensive.
 *   3. `data.metadata.phone_call.external_number` — telephony fallback. NOT
 *      typically populated for WhatsApp; documented for Twilio/SIP.
 *
 * Returns `null` if no path resolves. The caller maps that to a 200 response
 * with `processingStatus='orphaned'` so we never lose payloads to a 500.
 */
export interface ResolvedUser {
  id: string
  phoneE164: string
  displayName: string
  isActive: boolean
  resolvedVia:
    | 'top_level_user_id'
    | 'dynamic_variable_user_id'
    | 'phone_e164'
}

const userPick = {
  id: true,
  phoneE164: true,
  displayName: true,
  isActive: true,
} as const

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function resolveUserFromTranscription(
  data: PostCallTranscriptionData,
): Promise<ResolvedUser | null> {
  // Tier 1: top-level user_id
  if (data.user_id && UUID_RE.test(data.user_id)) {
    const u = await prisma.user.findUnique({
      where: { id: data.user_id },
      select: userPick,
    })
    if (u) return { ...u, resolvedVia: 'top_level_user_id' }
  }

  // Tier 2: dynamic_variables.user_id
  const dyn =
    data.conversation_initiation_client_data?.dynamic_variables?.user_id
  if (typeof dyn === 'string' && UUID_RE.test(dyn)) {
    const u = await prisma.user.findUnique({
      where: { id: dyn },
      select: userPick,
    })
    if (u) return { ...u, resolvedVia: 'dynamic_variable_user_id' }
  }

  // Tier 3: phone fallback (telephony only — WhatsApp doesn't usually populate this)
  const phone = data.metadata?.phone_call?.external_number
  if (phone) {
    const normalized = normalizePhoneE164(phone)
    if (normalized) {
      const u = await prisma.user.findFirst({
        where: { phoneE164: { in: phoneLookupCandidates(normalized) } },
        select: userPick,
      })
      if (u) return { ...u, resolvedVia: 'phone_e164' }
    }
  }

  return null
}
