import { NextRequest } from 'next/server'
import { GET } from '../route'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import { GROK_TTS_FALLBACK_VOICES, resetGrokVoiceListCacheForTests } from '@/lib/grokTtsVoices'

jest.mock('@/lib/grokVoiceAccess', () => ({
  assertGrokVoiceAccess: jest.fn(),
  GROK_VOICE_NO_STORE: { 'Cache-Control': 'no-store' },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const mockAccess = assertGrokVoiceAccess as jest.MockedFunction<typeof assertGrokVoiceAccess>
const originalFetch = global.fetch

function get() {
  return GET(new NextRequest('http://localhost/api/read-aloud/voices'))
}

describe('GET /api/read-aloud/voices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetGrokVoiceListCacheForTests()
    mockAccess.mockResolvedValue({
      ok: true,
      xaiKey: 'super-secret-key',
      codeId: 'code-1',
      deviceId: 'device-1',
      tokenHash: 'hash',
    })
    global.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
    resetGrokVoiceListCacheForTests()
  })

  it('returns 401 without calling xAI when the device token is invalid', async () => {
    mockAccess.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
      code: 'grok_token_invalid',
    })
    const response = await get()
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized', code: 'grok_token_invalid' })
    expect(JSON.stringify(body)).not.toContain('super-secret-key')
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

    const first = await get()
    const second = await get()
    expect(first.status).toBe(200)
    const body = await second.json()
    expect(body.voices).toEqual([
      { voiceId: 'eve', name: 'Eve', gender: 'female' },
      { voiceId: 'ara', name: 'Ara', gender: 'female' },
    ])
    expect(JSON.stringify(body)).not.toContain('super-secret-key')
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.x.ai/v1/tts/voices',
      expect.objectContaining({ headers: { Authorization: 'Bearer super-secret-key' } })
    )

    now.mockReturnValue(1_000 + 24 * 60 * 60 * 1000)
    await get()
    expect(global.fetch).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })

  it('returns the static 28-voice list when xAI fails, without caching that fallback', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as typeof fetch
    const first = await get()
    const second = await get()
    const body = await first.json()
    expect(body.fallback).toBe(true)
    expect(body.voices).toHaveLength(28)
    expect(body.voices).toEqual(GROK_TTS_FALLBACK_VOICES)
    await expect(second.json()).resolves.toMatchObject({ fallback: true })
    expect(global.fetch).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(body)).not.toContain('super-secret-key')
  })
})
