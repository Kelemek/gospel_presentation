import { NextRequest } from 'next/server'
import { POST } from '../route'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import { consumeGrokVoiceRateLimit, recordGrokVoiceUsage } from '@/lib/grokVoiceDb'

jest.mock('@/lib/grokVoiceAccess', () => ({
  assertGrokVoiceAccess: jest.fn(),
  GROK_VOICE_NO_STORE: { 'Cache-Control': 'no-store' },
}))

jest.mock('@/lib/grokVoiceDb', () => ({
  consumeGrokVoiceRateLimit: jest.fn().mockResolvedValue({ ok: true, allowed: true }),
  recordGrokVoiceUsage: jest.fn().mockResolvedValue({ ok: true, codeId: 'code-1', deviceId: 'device-1', chars: 2 }),
  grokTtsDeviceBucket: (id: string) => `tts:device:${id}`,
  grokTtsIpBucket: (ip: string) => `tts:ip:${ip}`,
  GROK_TTS_DEVICE_MAX: 20,
  GROK_TTS_DEVICE_WINDOW_SECONDS: 60,
  GROK_TTS_IP_MAX: 60,
  GROK_TTS_IP_WINDOW_SECONDS: 60,
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const mockAccess = assertGrokVoiceAccess as jest.MockedFunction<typeof assertGrokVoiceAccess>
const mockLimit = consumeGrokVoiceRateLimit as jest.MockedFunction<typeof consumeGrokVoiceRateLimit>
const mockRecord = recordGrokVoiceUsage as jest.MockedFunction<typeof recordGrokVoiceUsage>
const originalFetch = global.fetch
const allowed = { ok: true as const, xaiKey: 'super-secret-key', codeId: 'code-1', deviceId: 'device-1', tokenHash: 'hash' }

function post(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/read-aloud/tts', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  )
}

describe('POST /api/read-aloud/tts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAccess.mockResolvedValue(allowed)
    mockLimit.mockResolvedValue({ ok: true, allowed: true })
    global.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns 401 and does not call xAI when the device token is invalid', async () => {
    mockAccess.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
      code: 'grok_token_invalid',
    })
    const response = await post({ text: 'Hello', voiceId: 'eve', withTimestamps: false })
    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const body = await response.json()
    expect(body).toEqual({ error: 'Unauthorized', code: 'grok_token_invalid' })
    expect(JSON.stringify(body)).not.toContain('super-secret-key')
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('fails closed when the speech limiter cannot run and does not call xAI', async () => {
    mockLimit.mockResolvedValueOnce({ ok: false, unavailable: true })
    const down = await post({ text: 'Hello', voiceId: 'eve', withTimestamps: false })
    expect(down.status).toBe(503)
    expect(global.fetch).not.toHaveBeenCalled()

    mockLimit.mockResolvedValueOnce({ ok: true, allowed: false })
    const busy = await post({ text: 'Hello', voiceId: 'eve', withTimestamps: false })
    expect(busy.status).toBe(429)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('rejects text over 4000 characters, a bad voice id, and a missing withTimestamps flag', async () => {
    const longText = await post({ text: 'a'.repeat(4001), voiceId: 'eve', withTimestamps: true })
    expect(longText.status).toBe(400)

    const badVoice = await post({ text: 'Hello', voiceId: 'not a voice', withTimestamps: true })
    expect(badVoice.status).toBe(400)

    const missingFlag = await post({ text: 'Hello', voiceId: 'eve' })
    expect(missingFlag.status).toBe(400)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('posts speech text to xAI and returns JSON without the server key', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        audio: 'AQID',
        content_type: 'audio/mpeg',
        audio_timestamps: {
          graph_chars: ['H', 'i'],
          graph_times: [
            [0, 0.1],
            [0.1, 0.2],
          ],
        },
      }),
    }) as typeof fetch

    const response = await post({ text: 'Hi', voiceId: 'Eve', withTimestamps: true })
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const body = await response.json()
    expect(body).toEqual({
      audio: 'AQID',
      contentType: 'audio/mpeg',
      audioTimestamps: {
        graphChars: ['H', 'i'],
        graphTimes: [
          [0, 0.1],
          [0.1, 0.2],
        ],
      },
    })
    expect(JSON.stringify(body)).not.toContain('super-secret-key')
    expect(mockRecord).toHaveBeenCalledWith({
      tokenHash: 'hash',
      chars: 2,
      audioSeconds: 0.2,
      estimated: false,
    })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.x.ai/v1/tts',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer super-secret-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Hi',
          voice_id: 'eve',
          language: 'en',
          with_timestamps: true,
        }),
      })
    )
  })

  it('wraps raw audio bytes as JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'audio/mpeg' },
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
    }) as typeof fetch

    const response = await post({ text: 'Hi', voiceId: 'eve', withTimestamps: false })
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      audio: Buffer.from([1, 2, 3]).toString('base64'),
      contentType: 'audio/mpeg',
    })
  })

  it('maps upstream 429 to 429 and other upstream failures to 502', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => 'application/json' },
    }) as typeof fetch
    const limited = await post({ text: 'Hi', voiceId: 'eve', withTimestamps: false })
    expect(limited.status).toBe(429)

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
    }) as typeof fetch
    const failed = await post({ text: 'Hi', voiceId: 'eve', withTimestamps: false })
    expect(failed.status).toBe(502)
  })
})
