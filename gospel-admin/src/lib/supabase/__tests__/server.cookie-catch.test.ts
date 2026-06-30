import { jest } from '@jest/globals'

describe('supabase server cookie handlers - catch branches', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('swallows error when cookieStore.set throws in setAll', async () => {
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        getAll: () => [],
        set: () => {
          throw new Error('set-failure')
        },
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
    expect(() =>
      (client as any).__cookieImpl.setAll([{ name: 'a', value: 'b', options: {} }])
    ).not.toThrow()
  })

  it('swallows non-Error throws from cookieStore in setAll', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        getAll: () => [],
        set: () => {
          throw 'nope'
        },
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
    expect(() =>
      (client as any).__cookieImpl.setAll([{ name: 'a', value: 'b', options: {} }])
    ).not.toThrow()
  })

  it('getAll returns underlying cookies when present', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        getAll: () => [{ name: 'my', value: 'cookie-value' }],
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
    expect((client as any).__cookieImpl.getAll()).toEqual([{ name: 'my', value: 'cookie-value' }])
  })

  it('getAll returns empty list when no cookies', async () => {
    jest.resetModules()
    jest.doMock('next/headers', () => ({
      cookies: () => ({
        getAll: () => [],
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
    expect((client as any).__cookieImpl.getAll()).toEqual([])
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
    expect((admin as any).__cookieImpl.getAll()).toEqual([])
    expect(() =>
      (admin as any).__cookieImpl.setAll([{ name: 'a', value: 'b', options: {} }])
    ).not.toThrow()
  })
})
