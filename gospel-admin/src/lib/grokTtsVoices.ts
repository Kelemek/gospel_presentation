export type GrokVoice = {
  voiceId: string
  name: string
}

export const GROK_TTS_FALLBACK_VOICES: readonly GrokVoice[] = [
  { voiceId: 'carina', name: 'Carina' },
  { voiceId: 'zagan', name: 'Zagan' },
  { voiceId: 'helix', name: 'Helix' },
  { voiceId: 'orion', name: 'Orion' },
  { voiceId: 'luna', name: 'Luna' },
  { voiceId: 'iris', name: 'Iris' },
  { voiceId: 'altair', name: 'Altair' },
  { voiceId: 'zenith', name: 'Zenith' },
  { voiceId: 'perseus', name: 'Perseus' },
  { voiceId: 'helios', name: 'Helios' },
  { voiceId: 'lux', name: 'Lux' },
  { voiceId: 'kepler', name: 'Kepler' },
  { voiceId: 'rigel', name: 'Rigel' },
  { voiceId: 'cosmo', name: 'Cosmo' },
  { voiceId: 'celeste', name: 'Celeste' },
  { voiceId: 'ursa', name: 'Ursa' },
  { voiceId: 'sirius', name: 'Sirius' },
  { voiceId: 'lumen', name: 'Lumen' },
  { voiceId: 'castor', name: 'Castor' },
  { voiceId: 'naksh', name: 'Naksh' },
  { voiceId: 'atlas', name: 'Atlas' },
  { voiceId: 'aurora', name: 'Aurora' },
  { voiceId: 'liora', name: 'Liora' },
  { voiceId: 'ara', name: 'Ara' },
  { voiceId: 'eve', name: 'Eve' },
  { voiceId: 'leo', name: 'Leo' },
  { voiceId: 'rex', name: 'Rex' },
  { voiceId: 'sal', name: 'Sal' },
]

const VOICE_ID = /^[a-z0-9_-]{1,64}$/i
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

let voiceListCache: { expiresAt: number; voices: GrokVoice[] } | null = null

export function isGrokVoiceId(value: string): boolean {
  return VOICE_ID.test(value)
}

export function parseGrokVoiceList(payload: unknown): GrokVoice[] | null {
  if (!payload || typeof payload !== 'object') return null
  const voices = (payload as { voices?: unknown }).voices
  if (!Array.isArray(voices)) return null
  const out: GrokVoice[] = []
  for (const row of voices) {
    if (!row || typeof row !== 'object') continue
    const voiceId = (row as { voice_id?: unknown }).voice_id
    const name = (row as { name?: unknown }).name
    if (typeof voiceId !== 'string' || !isGrokVoiceId(voiceId)) continue
    const id = voiceId.toLowerCase()
    out.push({
      voiceId: id,
      name: typeof name === 'string' && name.trim() ? name.trim() : id,
    })
  }
  return out.length > 0 ? out : null
}

export function readCachedGrokVoices(now = Date.now()): GrokVoice[] | null {
  if (!voiceListCache || now >= voiceListCache.expiresAt) return null
  return voiceListCache.voices
}

export function writeCachedGrokVoices(voices: GrokVoice[], now = Date.now()): void {
  voiceListCache = { voices, expiresAt: now + CACHE_TTL_MS }
}

export function resetGrokVoiceListCacheForTests(): void {
  voiceListCache = null
}
