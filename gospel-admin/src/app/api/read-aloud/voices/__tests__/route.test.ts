import { GET } from '../route'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import { GROK_TTS_FALLBACK_VOICES, resetGrokVoiceListCacheForTests } from '@/lib/grokTtsVoices'

jest.mock('@/lib/grokVoiceAccess', () => ({
  assertGrokVoiceAccess: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const mockAccess = assertGrokVoiceAccess as jest.MockedFunction<typeof assertGrokVoiceAccess>
const originalFetch = global.fetch

describe('GET /api/read-aloud/voices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetGrokVoiceListCacheForTests()
    mockAccess.mockResolvedValue({ ok: true, userId: 'user-1', xaiKey: 'super-secret-key' })
    global.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    resetGrokVoiceListCacheForTests()
  })

  it('returns 401 without calling xAI when the session is missing', async () => {
    mockAccess.mockResolvedValue({ ok: false, status: 401, error: 'Unauthorized' })
    const response = await GET()
    expect(response.status).toBe(401)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('caches a successful voice list for 24 hours and never returns the server key', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          { voice_id: 'eve', name: 'Eve' },
          { voice_id: 'ara', name: 'Ara' },
        ],
      }),
    }) as typeof fetch

    const first = await GET()
    const second = await GET()
    expect(first.status).toBe(200)
    const body = await second.json()
    expect(body.voices).toEqual([
      { voiceId: 'eve', name: 'Eve' },
      { voiceId: 'ara', name: 'Ara' },
    ])
    expect(JSON.stringify(body)).not.toContain('super-secret-key')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.x.ai/v1/tts/voices',
      expect.objectContaining({ headers: { Authorization: 'Bearer super-secret-key' } })
    )

    now.mockReturnValue(1_000 + 24 * 60 * 60 * 1000)
    await GET()
    expect(global.fetch).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })

  it('returns the static 28-voice list when xAI fails, without caching that fallback', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch
    const first = await GET()
    const second = await GET()
    const body = await first.json()
    expect(body.fallback).toBe(true)
    expect(body.voices).toHaveLength(28)
    expect(body.voices).toEqual(GROK_TTS_FALLBACK_VOICES)
    await expect(second.json()).resolves.toMatchObject({ fallback: true })
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(body)).not.toContain('super-secret-key')
  })
})
