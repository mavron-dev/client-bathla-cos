import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'

let _client: ElevenLabsClient | null = null

/**
 * SDK singleton. Webhook verification only needs `client.webhooks` — no real
 * API calls go through here yet — but instantiating once keeps things tidy
 * for when we add outbound calls later (e.g. agent management endpoints).
 */
export function getElevenLabsClient(): ElevenLabsClient {
  if (_client) return _client
  _client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY ?? 'webhook-only',
  })
  return _client
}
