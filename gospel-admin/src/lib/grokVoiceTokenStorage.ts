export const GROK_VOICE_TOKEN_STORAGE_KEY = 'gospel-grok-voice-token:v1'
export const GROK_VOICE_TOKEN_HEADER = 'X-Grok-Voice-Token'
export const GROK_VOICE_TOKEN_INVALID = 'grok_token_invalid'

const TOKEN_PATTERN = /^gvt_[A-Za-z0-9_-]{43}$/

function storage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readGrokVoiceToken(): string | null {
  const store = storage()
  if (!store) return null
  try {
    const value = store.getItem(GROK_VOICE_TOKEN_STORAGE_KEY)
    if (!value || !TOKEN_PATTERN.test(value)) return null
    return value
  } catch {
    return null
  }
}

export function writeGrokVoiceToken(token: string): void {
  if (!TOKEN_PATTERN.test(token)) return
  const store = storage()
  if (!store) return
  store.setItem(GROK_VOICE_TOKEN_STORAGE_KEY, token)
}

export function clearGrokVoiceToken(): void {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(GROK_VOICE_TOKEN_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function grokVoiceRequestHeaders(token = readGrokVoiceToken()): Record<string, string> {
  if (!token) return {}
  return { [GROK_VOICE_TOKEN_HEADER]: token }
}

export async function noteGrokVoiceRejection(response: Response): Promise<void> {
  if (response.status !== 401) return
  let code: unknown
  try {
    const source = typeof response.clone === 'function' ? response.clone() : response
    code = ((await source.json()) as { code?: unknown }).code
  } catch {
    return
  }
  if (code === GROK_VOICE_TOKEN_INVALID) clearGrokVoiceToken()
}
