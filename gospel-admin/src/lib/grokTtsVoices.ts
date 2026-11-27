export type GrokVoiceGender = 'male' | 'female'

export type GrokVoice = {
  voiceId: string
  name: string
  gender: GrokVoiceGender | null
}

const FEMALE_VOICE_IDS = [
  'ara',
  'aurora',
  'carina',
  'celeste',
  'eve',
  'iris',
  'liora',
  'luna',
  'ursa',
] as const

const MALE_VOICE_IDS = [
  'altair',
  'atlas',
  'castor',
  'cosmo',
  'helios',
  'helix',
  'kepler',
  'leo',
  'lumen',
  'lux',
  'naksh',
  'orion',
  'perseus',
  'rex',
  'rigel',
  'sal',
  'sirius',
  'zagan',
  'zenith',
] as const

const FEMALE_VOICE_ID_SET = new Set<string>(FEMALE_VOICE_IDS)
const MALE_VOICE_ID_SET = new Set<string>(MALE_VOICE_IDS)

const FALLBACK_VOICE_ROWS: readonly { voiceId: string; name: string }[] = [
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

export function genderForGrokVoiceId(voiceId: string): GrokVoiceGender | null {
  const id = voiceId.toLowerCase()
  if (FEMALE_VOICE_ID_SET.has(id)) return 'female'
  if (MALE_VOICE_ID_SET.has(id)) return 'male'
  return null
}

function genderFromPayload(value: unknown, voiceId: string): GrokVoiceGender | null {
  if (value === 'female' || value === 'male') return value
  return genderForGrokVoiceId(voiceId)
}

export const GROK_TTS_FALLBACK_VOICES: readonly GrokVoice[] = FALLBACK_VOICE_ROWS.map((voice) => ({
  ...voice,
  gender: genderForGrokVoiceId(voice.voiceId),
}))

export function groupGrokVoices(voices: readonly GrokVoice[]): {
  female: GrokVoice[]
  male: GrokVoice[]
  other: GrokVoice[]
} {
  const female: GrokVoice[] = []
  const male: GrokVoice[] = []
  const other: GrokVoice[] = []
  for (const voice of voices) {
    const gender = voice.gender === 'female' || voice.gender === 'male' ? voice.gender : null
    switch (gender) {
      case 'female':
        female.push(voice)
        break
      case 'male':
        male.push(voice)
        break
      case null:
        other.push(voice)
        break
      default: {
        const unexpected: never = gender
        void unexpected
        break
      }
    }
  }
  return { female, male, other }
}

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
    const gender = (row as { gender?: unknown }).gender
    if (typeof voiceId !== 'string' || !isGrokVoiceId(voiceId)) continue
    const id = voiceId.toLowerCase()
    out.push({
      voiceId: id,
      name: typeof name === 'string' && name.trim() ? name.trim() : id,
      gender: genderFromPayload(gender, id),
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
