import { NextRequest } from 'next/server'
import { GET } from '../route'
import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import { GROK_VOICE_TOKEN_HEADER } from '@/lib/grokVoiceTokenStorage'

jest.mock('@/lib/grokVoiceAccess', () => ({
  assertGrokVoiceAccess: jest.fn(),
  GROK_VOICE_NO_STORE: { 'Cache-Control': 'no-store' },
}))

const access = assertGrokVoiceAccess as jest.MockedFunction<typeof assertGrokVoiceAccess>
const TOKEN = `gvt_${'b'.repeat(43)}`

function get(token?: string) {
  return GET(
    new NextRequest('http://localhost/api/read-aloud/access', {
      headers: token ? { [GROK_VOICE_TOKEN_HEADER]: token } : {},
    })
  )
}

describe('GET /api/read-aloud/access', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('reports disabled when this device has no token and does not consult access', async () => {
    const response = await get()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ enabled: false })
    expect(access).not.toHaveBeenCalled()
  })

  it('reports enabled for a live token without returning the xAI key', async () => {
    access.mockResolvedValue({
      ok: true,
      xaiKey: 'server-key',
      codeId: 'code-1',
      deviceId: 'device-1',
      tokenHash: 'hash',
    })
    const response = await get(TOKEN)
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ enabled: true })
    expect(JSON.stringify(body)).not.toContain('server-key')
  })

  it('returns the invalid-token code so the device can clear it', async () => {
    access.mockResolvedValue({
      ok: false,
      status: 401,
      error: 'Unauthorized',
      code: 'grok_token_invalid',
    })
    const response = await get(TOKEN)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ enabled: false, code: 'grok_token_invalid' })
    expect(JSON.stringify(await get(TOKEN).then((res) => res.json()))).not.toContain('server-key')
  })

  it('stays disabled without the invalid-token code when the server key is missing', async () => {
    access.mockResolvedValue({
      ok: false,
      status: 503,
      error: 'Grok voice is not configured on the server.',
    })
    const response = await get(TOKEN)
    expect(response.status).toBe(503)
    const body = await response.json()
    expect(body).toEqual({ enabled: false })
    expect(body).not.toHaveProperty('code')
  })
})
