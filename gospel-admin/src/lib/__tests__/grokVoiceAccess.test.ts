import { NextRequest } from 'next/server'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import { lookupGrokVoiceToken } from '@/lib/grokVoiceDb'
import { sha256Hex } from '@/lib/grokVoiceCode'
import { GROK_VOICE_TOKEN_HEADER } from '@/lib/grokVoiceTokenStorage'

jest.mock('@/lib/grokVoiceDb', () => ({
  lookupGrokVoiceToken: jest.fn(),
}))

const lookup = lookupGrokVoiceToken as jest.MockedFunction<typeof lookupGrokVoiceToken>
const TOKEN = `gvt_${'a'.repeat(43)}`

function request(token?: string): NextRequest {
  return new NextRequest('http://localhost/api/read-aloud/tts', {
    headers: token ? { [GROK_VOICE_TOKEN_HEADER]: token } : {},
  })
}

describe('assertGrokVoiceAccess', () => {
  const originalKey = process.env.XAI_API_KEY

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.XAI_API_KEY = 'server-key'
  })

  afterAll(() => {
    if (originalKey === undefined) delete process.env.XAI_API_KEY
    else process.env.XAI_API_KEY = originalKey
  })

  it('returns 401 and does not look up a missing or malformed token', async () => {
    expect(await assertGrokVoiceAccess(request())).toEqual({
      ok: false,
      status: 401,
      error: 'Unauthorized',
      code: 'grok_token_invalid',
    })
    expect(await assertGrokVoiceAccess(request('gvt_short'))).toMatchObject({
      status: 401,
      code: 'grok_token_invalid',
    })
    expect(lookup).not.toHaveBeenCalled()
  })

  it('returns 401 when the token is revoked or unknown and never includes the xAI key', async () => {
    lookup.mockResolvedValue({ ok: false, denied: true })
    const access = await assertGrokVoiceAccess(request(TOKEN))
    expect(access).toEqual({
      ok: false,
      status: 401,
      error: 'Unauthorized',
      code: 'grok_token_invalid',
    })
    expect(JSON.stringify(access)).not.toContain('server-key')
    expect(lookup).toHaveBeenCalledWith(sha256Hex(TOKEN))
    expect(lookup.mock.calls[0]?.[0]).not.toBe(TOKEN)
  })

  it('returns 503 when the lookup cannot run, without marking the token invalid', async () => {
    lookup.mockResolvedValue({ ok: false, unavailable: true })
    const access = await assertGrokVoiceAccess(request(TOKEN))
    expect(access).toEqual({
      ok: false,
      status: 503,
      error: 'Grok voice is not available right now.',
    })
    expect(access).not.toHaveProperty('code')
    expect(JSON.stringify(access)).not.toContain('server-key')
  })

  it('returns 503 when the token is valid and the server key is missing', async () => {
    delete process.env.XAI_API_KEY
    lookup.mockResolvedValue({ ok: true, codeId: 'code-1', deviceId: 'device-1' })
    const access = await assertGrokVoiceAccess(request(TOKEN))
    expect(access).toEqual({
      ok: false,
      status: 503,
      error: 'Grok voice is not configured on the server.',
    })
    expect(JSON.stringify(access)).not.toContain('xaiKey')
  })

  it('returns the server key only for a live token', async () => {
    lookup.mockResolvedValue({ ok: true, codeId: 'code-1', deviceId: 'device-1' })
    const access = await assertGrokVoiceAccess(request(TOKEN))
    expect(access).toEqual({
      ok: true,
      xaiKey: 'server-key',
      codeId: 'code-1',
      deviceId: 'device-1',
      tokenHash: sha256Hex(TOKEN),
    })
  })
})
