import { assertGrokVoiceAccess } from '@/lib/grokVoiceAccess'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

function clientWith(options: {
  userId?: string | null
  enabled?: boolean
  profileError?: boolean
}) {
  const user = options.userId ? { id: options.userId } : null
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: options.profileError ? null : { grok_voice_enabled: options.enabled === true },
            error: options.profileError ? { message: 'missing' } : null,
          }),
        }),
      }),
    }),
  }
}

describe('assertGrokVoiceAccess', () => {
  const originalKey = process.env.XAI_API_KEY

  beforeEach(() => {
    process.env.XAI_API_KEY = 'server-key'
  })

  afterAll(() => {
    if (originalKey === undefined) delete process.env.XAI_API_KEY
    else process.env.XAI_API_KEY = originalKey
  })

  it('returns 401 when there is no session', async () => {
    jest.mocked(createClient).mockResolvedValue(clientWith({ userId: null }) as never)
    const access = await assertGrokVoiceAccess()
    expect(access).toEqual({ ok: false, status: 401, error: 'Unauthorized' })
  })

  it('returns 403 when Grok voice is off', async () => {
    jest.mocked(createClient).mockResolvedValue(clientWith({ userId: 'user-1', enabled: false }) as never)
    const access = await assertGrokVoiceAccess()
    expect(access).toEqual({
      ok: false,
      status: 403,
      error: 'Grok voice is not enabled for this account.',
    })
  })

  it('returns 503 when the account is enabled and the server key is missing', async () => {
    delete process.env.XAI_API_KEY
    jest.mocked(createClient).mockResolvedValue(clientWith({ userId: 'user-1', enabled: true }) as never)
    const access = await assertGrokVoiceAccess()
    expect(access).toEqual({
      ok: false,
      status: 503,
      error: 'Grok voice is not configured on the server.',
    })
  })

  it('returns the server key for an enabled account', async () => {
    jest.mocked(createClient).mockResolvedValue(clientWith({ userId: 'user-1', enabled: true }) as never)
    const access = await assertGrokVoiceAccess()
    expect(access).toEqual({ ok: true, userId: 'user-1', xaiKey: 'server-key' })
  })
})
