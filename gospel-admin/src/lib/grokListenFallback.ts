export const GROK_LISTEN_FALLBACK_NOTE =
  "Grok voice is unavailable right now. Continuing with this device's voice."

export type GrokListenFailure = 'offline' | 'network' | number

export function shouldFallbackGrokListenToDevice(
  failure: GrokListenFailure,
  deviceSpeechAvailable: boolean
): boolean {
  if (!deviceSpeechAvailable) return false
  if (failure === 'offline' || failure === 'network') return true
  if (failure === 429) return true
  return failure >= 400
}
