import { gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { isGrokVoiceId } from '@/lib/grokTtsVoices'

export const RESOURCE_LISTEN_VOICE_STORAGE_KEY = 'gospel-admin:resource-listen-voice'
export const DEVICE_LISTEN_VOICE_ID = 'device'

export function readResourceListenVoice(): string {
  if (typeof window === 'undefined') return DEVICE_LISTEN_VOICE_ID
  try {
    const raw = window.localStorage.getItem(RESOURCE_LISTEN_VOICE_STORAGE_KEY)
    if (!raw || raw === DEVICE_LISTEN_VOICE_ID) return DEVICE_LISTEN_VOICE_ID
    return isGrokVoiceId(raw) ? raw.toLowerCase() : DEVICE_LISTEN_VOICE_ID
  } catch {
    return DEVICE_LISTEN_VOICE_ID
  }
}

export function writeResourceListenVoice(voiceId: string): void {
  if (typeof window === 'undefined') return
  const stored =
    voiceId === DEVICE_LISTEN_VOICE_ID || !isGrokVoiceId(voiceId)
      ? DEVICE_LISTEN_VOICE_ID
      : voiceId.toLowerCase()
  try {
    gospelStorageSetSync(RESOURCE_LISTEN_VOICE_STORAGE_KEY, stored)
  } catch {
    // ignore
  }
}
