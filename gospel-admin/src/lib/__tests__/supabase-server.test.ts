import { jest } from '@jest/globals'

describe('supabase server helpers', () => {
  beforeEach(() => {
    jest.resetModules()
    // set defaults that tests will override as needed
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
    process.env.SUPABASE_SERVICE_KEY = 'service-key'
  })

  it('createClient calls createServerClient with anon key and cookie handlers', async () => {
    const mockCreate = jest.fn().mockReturnValue({ ok: true })

    // Mock the ssr exporter and next/headers before importing the module
    jest.doMock('@supabase/ssr', () => ({ createServerClient: mockCreate }))
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: (name: string) => ({ value: `val-${name}` }),
        set: jest.fn(),
        remove: jest.fn(),
      }),
    }))

    const mod = await import('../supabase/server')
    const { createClient } = mod

    const client = await createClient()

    expect(client).toEqual({ ok: true })
    expect(mockCreate).toHaveBeenCalled()

    const [url, key, opts] = mockCreate.mock.calls[0]
    expect(url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL)
    expect(key).toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    expect(opts).toBeDefined()
    expect(typeof opts.cookies.get).toBe('function')
    expect(typeof opts.cookies.set).toBe('function')
  })

  it('createAdminClient calls createServerClient with service key', async () => {
    const mockCreate = jest.fn().mockReturnValue({ admin: true })
    jest.doMock('@supabase/ssr', () => ({ createServerClient: mockCreate }))
    // next/headers not needed for admin client
    jest.doMock('next/headers', () => ({ cookies: () => ({ get: () => undefined, set: () => {}, remove: () => {} }) }))

    const mod = await import('../supabase/server')
    const { createAdminClient } = mod

    const admin = createAdminClient()

    expect(admin).toEqual({ admin: true })
    const [url, key] = mockCreate.mock.calls[0]
    expect(url).toBe(process.env.NEXT_PUBLIC_SUPABASE_URL)
    expect(key).toBe(process.env.SUPABASE_SERVICE_KEY)
  })
})
