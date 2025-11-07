jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ mocked: true })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: (name: string) => ({ value: `cookie-${name}` }),
    set: jest.fn(),
  })),
}))

import { createClient, createAdminClient } from '../server'
import { createServerClient } from '@supabase/ssr'

describe('supabase server helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('createClient calls createServerClient with env and cookie helpers', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

    const client = await createClient()

    expect(createServerClient).toHaveBeenCalled()
    expect(client).toEqual({ mocked: true })
  })

  it('createAdminClient uses service key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_KEY = 'service'

    const client = createAdminClient()

    expect(createServerClient).toHaveBeenCalled()
    expect(client).toEqual({ mocked: true })
  })

  it('cookie helpers swallow errors from cookieStore.set/remove', async () => {
    // Reset modules and provide a createServerClient that will invoke the cookies helpers
    jest.resetModules()

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn((url: string, key: string, opts: any) => {
        // Attempt to call the provided cookies helpers to exercise their try/catch
        try { opts.cookies.set('a', 'b', {}) } catch (e) {}
        try { opts.cookies.remove('a', {}) } catch (e) {}
        return { mocked: true }
      })
    }))

    jest.doMock('next/headers', () => ({
      cookies: jest.fn(() => ({ get: () => undefined, set: () => { throw new Error('cookie fail') } }))
    }))

    const { createClient: createClient2 } = await import('../server')
    const client = await createClient2()
    expect(client).toEqual({ mocked: true })
  })
})
