import { getElevenLabsClient } from './client'
import type { ElevenLabsWebhookEvent } from './types'

export type WebhookVerificationReason =
  | 'missing_signature'
  | 'invalid_signature'
  | 'expired_timestamp'
  | 'malformed'

export class WebhookVerificationError extends Error {
  constructor(
    message: string,
    public readonly reason: WebhookVerificationReason,
  ) {
    super(message)
    this.name = 'WebhookVerificationError'
  }
}

/**
 * Verify an ElevenLabs webhook request and parse the event. The SDK handles
 * HMAC-SHA256 verify, the 30-min timestamp window, and JSON parsing in one
 * call. We translate its error messages into typed reasons so the route
 * handler can pick the right HTTP status and audit row code.
 *
 * Note: SDK's `constructEvent` is async (despite its sync-looking name) — we
 * await it here.
 */
export async function verifyElevenLabsWebhook(
  rawBody: string,
  signatureHeader: string | null,
): Promise<ElevenLabsWebhookEvent> {
  if (!signatureHeader) {
    throw new WebhookVerificationError(
      'Missing elevenlabs-signature header',
      'missing_signature',
    )
  }

  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET
  if (!secret) {
    // Different from a verification failure — this is a server config bug.
    throw new Error('ELEVENLABS_WEBHOOK_SECRET not configured')
  }

  const client = getElevenLabsClient()

  try {
    const event = await client.webhooks.constructEvent(
      rawBody,
      signatureHeader,
      secret,
    )
    return event as ElevenLabsWebhookEvent
  } catch (err: unknown) {
    const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
    if (msg.includes('timestamp') || msg.includes('expired')) {
      throw new WebhookVerificationError(
        err instanceof Error ? err.message : 'expired',
        'expired_timestamp',
      )
    }
    if (msg.includes('signature')) {
      throw new WebhookVerificationError(
        err instanceof Error ? err.message : 'invalid signature',
        'invalid_signature',
      )
    }
    throw new WebhookVerificationError(
      err instanceof Error ? err.message : 'unknown',
      'malformed',
    )
  }
}
