// Tests for the auth callback route

// Provide a NextResponse.redirect mock for these tests
jest.mock('next/server', () => ({
  NextResponse: {
    redirect: (url: any) => ({ redirectedTo: url.toString() }),
  },
}))

describe('auth callback route', () => {
  afterEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('redirects to login when no code provided', async () => {
  // eslint-disable-next-line global-require
  const handler = require('@/app/auth/callback/route')
  // jsdom/Node doesn't expose Request in this environment; the handler only
  // reads `request.url`, so pass a minimal object.
  const res = await handler.GET({ url: 'https://example.com/auth/callback' })
  expect(res).toEqual({ redirectedTo: 'https://example.com/login?error=No%20authentication%20code%20provided' })
  })

  it('redirects to login when error param present', async () => {
  // eslint-disable-next-line global-require
  const handler = require('@/app/auth/callback/route')
  const res = await handler.GET({ url: 'https://example.com/auth/callback?error=fail&error_description=bad' })
  expect(res).toEqual({ redirectedTo: 'https://example.com/login?error=bad' })
  })

  it('redirects to login when exchangeCodeForSession reports error', async () => {
    // Mock createClient to simulate exchange error
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession: async (code: any) => ({ error: { message: 'exchange failed' } }),
        }
      })
    }))

  // eslint-disable-next-line global-require
  const handler = require('@/app/auth/callback/route')
  const res = await handler.GET({ url: 'https://example.com/auth/callback?code=abc' })
  expect(res).toEqual({ redirectedTo: 'https://example.com/login?error=exchange%20failed' })
  })

  it('redirects counselee with single access to that profile', async () => {
    // Simulate supabase client behavior for counselee with single profile access
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: {
          exchangeCodeForSession: async () => ({ error: null }),
          getUser: async () => ({ data: { user: { id: 'u1', email: 'u1@example.com' } } }),
        },
        from: (table: string) => ({
          select: (cols: string) => ({
            eq: (col: string, val: any) => {
              if (table === 'user_profiles') {
                return { single: async () => ({ data: { role: 'counselee' } }) }
              }
              if (table === 'profile_access') {
                return Promise.resolve({ data: [{ profiles: { slug: 'myslug' } }] })
              }
              return Promise.resolve({ data: null })
            }
          })
        })
      })
    }))

  // eslint-disable-next-line global-require
  const handler = require('@/app/auth/callback/route')
  const res = await handler.GET({ url: 'https://example.com/auth/callback?code=abc' })
  expect(res).toEqual({ redirectedTo: 'https://example.com/myslug' })
  })
})
