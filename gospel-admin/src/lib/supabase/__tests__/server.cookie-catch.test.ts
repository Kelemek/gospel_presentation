import { jest } from '@jest/globals'

describe('supabase server cookie handlers - catch branches', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('swallows error when cookieStore.set throws (set)', async () => {
    // Mock next/headers cookies() to return a store whose set throws
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: (name: string) => undefined,
        set: () => { throw new Error('set-failure') },
      }),
    }))

    // Mock createServerClient to capture the cookies impl and return it
    jest.doMock('@supabase/ssr', () => ({
      createServerClient: (_: any, __: any, opts: any) => {
        return { __cookieImpl: opts.cookies }
      },
    }))

    const mod = await import('../server')
    const { createClient } = mod

  const client = await createClient()
  // call the cookie impl's set which should trigger the internal try/catch
  expect(() => (client as any).__cookieImpl.set('a', 'b', {})).not.toThrow()
  })

  it('swallows error when cookieStore.set throws (remove)', async () => {
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: (name: string) => undefined,
        set: () => { throw new Error('remove-failure') },
      }),
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: (_: any, __: any, opts: any) => {
        return { __cookieImpl: opts.cookies }
      },
    }))

    const mod = await import('../server')
    const { createClient } = mod

  const client = await createClient()
  expect(() => (client as any).__cookieImpl.remove('a', {})).not.toThrow()
  })

  it('swallows non-Error throws from cookieStore (set/remove)', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: (name: string) => undefined,
        set: () => { throw 'nope' },
      }),
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: (_: any, __: any, opts: any) => {
        return { __cookieImpl: opts.cookies }
      },
    }))

    const mod = await import('../server')
    const { createClient } = mod

    const client = await createClient()
    expect(() => (client as any).__cookieImpl.set('a', 'b', {})).not.toThrow()
    expect(() => (client as any).__cookieImpl.remove('a', {})).not.toThrow()
  })

  it('get returns underlying cookie value when present', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: (name: string) => ({ value: 'cookie-value' }),
        set: () => {},
      }),
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: (_: any, __: any, opts: any) => {
        return { __cookieImpl: opts.cookies }
      },
    }))

    const mod = await import('../server')
    const { createClient } = mod

    const client = await createClient()
    expect((client as any).__cookieImpl.get('my')).toBe('cookie-value')
  })

  it('get returns undefined when cookie missing', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: (name: string) => undefined,
        set: () => {},
      }),
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: (_: any, __: any, opts: any) => {
        return { __cookieImpl: opts.cookies }
      },
    }))

    const mod = await import('../server')
    const { createClient } = mod

    const client = await createClient()
    expect((client as any).__cookieImpl.get('missing')).toBeUndefined()
  })

  it('createAdminClient cookie methods are no-ops', async () => {
    jest.doMock('@supabase/ssr', () => ({
      createServerClient: (_: any, __: any, opts: any) => {
        return { __cookieImpl: opts.cookies }
      },
    }))

    const mod = await import('../server')
    const { createAdminClient } = mod

  const admin = createAdminClient()
  // get should be defined and return undefined
  expect((admin as any).__cookieImpl.get()).toBeUndefined()
  // set/remove should be callable
  expect(() => (admin as any).__cookieImpl.set('a', 'b', {})).not.toThrow()
  expect(() => (admin as any).__cookieImpl.remove('a', {})).not.toThrow()
  })
})
