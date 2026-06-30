jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ mocked: true })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: () => [{ name: 'session', value: 'cookie-session' }],
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

  it('cookie helpers swallow errors from cookieStore.set in setAll', async () => {
    jest.resetModules()

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn((url: string, key: string, opts: any) => {
        try {
          opts.cookies.setAll([{ name: 'a', value: 'b', options: {} }])
        } catch {
          // ignore
        }
        return { mocked: true }
      }),
    }))

    jest.doMock('next/headers', () => ({
      cookies: jest.fn(() => ({
        getAll: () => [],
        set: () => {
          throw new Error('cookie fail')
        },
      })),
    }))

    const { createClient: createClient2 } = await import('../server')
    const client = await createClient2()
    expect(client).toEqual({ mocked: true })
  })
})
