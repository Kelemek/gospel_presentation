import { NextRequest } from 'next/server'
import { POST } from '../route'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'

jest.mock('@/lib/grokVoiceAccess', () => ({
  assertGrokVoiceAccess: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}))

const mockAccess = assertGrokVoiceAccess as jest.MockedFunction<typeof assertGrokVoiceAccess>
const originalFetch = global.fetch

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
    mockAccess.mockResolvedValue({ ok: true, userId: 'user-1', xaiKey: 'super-secret-key' })
    global.fetch = jest.fn() as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('returns the access status and does not call xAI when the account cannot use Grok voice', async () => {
    mockAccess.mockResolvedValue({ ok: false, status: 403, error: 'Grok voice is not enabled for this account.' })
    const response = await post({ text: 'Hello', voiceId: 'eve', withTimestamps: false })
    expect(response.status).toBe(403)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
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
