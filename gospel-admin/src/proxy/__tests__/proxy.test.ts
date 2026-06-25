// Provide a tighter mock for Next.js server helpers used by the proxy
jest.mock('next/server', () => {
  class MockNextRequest {
    url: any
    method: any
    body: any
    headers: any
    constructor(url: any, init: any = {}) {
      this.url = url
      this.method = init.method || 'GET'
      this.body = init.body
      this.headers = new Map()
    }
    async json() {
      if (typeof this.body === 'string') return JSON.parse(this.body)
      return this.body || {}
    }
  }

  const NextResponse = {
    next: () => ({
      headers: { get: () => null },
      cookies: { set: jest.fn() },
    }),
    redirect: (url: any) => ({ headers: { get: (k: any) => (k === 'location' ? String(url) : null) } }),
    json: (data: any, init: any = {}) => ({ json: () => Promise.resolve(data), status: init.status || 200 }),
  }

  return { NextRequest: MockNextRequest, NextResponse }
})

// Mock the server-side supabase client factory so we can control auth.getUser()
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

const { createClient } = require('@/lib/supabase/server')
const { proxy } = require('@/proxy')

function makeReq(pathname: string, url = `https://example.com${pathname}`) {
  const parsed = new URL(url)
  return {
    nextUrl: { pathname, searchParams: parsed.searchParams },
    url,
  } as unknown as Request
}

describe('proxy middleware', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('allows public routes (login, root, copyright, _next, api/public)', async () => {
    const publicPaths = ['/login', '/', '/copyright', '/_next/some', '/api/public/thing']

    for (const p of publicPaths) {
      const res = await proxy(makeReq(p) as any)
      // Public routes should not redirect (location header should be absent)
      expect(res.headers.get('location')).toBeNull()
    }
  })

  test('allows admin when user is present', async () => {
    // createClient should return an object with auth.getUser
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    })

    const res = await proxy(makeReq('/admin/dashboard') as any)
    expect(createClient).toHaveBeenCalled()
    expect(res.headers.get('location')).toBeNull()
  })

  test('redirects to login when admin route and no user', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    })

    const req = makeReq('/admin/secret', 'https://example.com/admin/secret')
    const res = await proxy(req as any)

    // Should redirect to /login with redirect param set
    const loc = res.headers.get('location')
    expect(loc).toBeTruthy()
    expect(loc).toContain('/login')
    expect(loc).toContain('redirect=%2Fadmin%2Fsecret')
  })

  test('allows other non-public, non-admin routes', async () => {
    const res = await proxy(makeReq('/some/other/path') as any)
    expect(res.headers.get('location')).toBeNull()
  })

  test('sets translation cookie on Kindle read profile URL with ?translation=', async () => {
    const res = await proxy(
      makeReq('/default/read/', 'https://example.com/default/read/?translation=kjv') as any
    )
    expect(res.headers.get('location')).toBeNull()
    expect(res.cookies.set).toHaveBeenCalledWith(
      'gospel-preferred-translation',
      'kjv',
      expect.objectContaining({ path: '/', sameSite: 'lax' })
    )
  })

  test('sets translation cookie on Kindle scripture read URL', async () => {
    const res = await proxy(
      makeReq(
        '/read/scripture/',
        'https://example.com/read/scripture/?ref=John%203%3A16&translation=nasb'
      ) as any
    )
    expect(res.cookies.set).toHaveBeenCalledWith(
      'gospel-preferred-translation',
      'nasb',
      expect.objectContaining({ path: '/' })
    )
  })

  test('sets text size cookie on Kindle read profile URL with ?textSize=', async () => {
    const res = await proxy(
      makeReq('/default/read/', 'https://example.com/default/read/?textSize=larger') as any
    )
    expect(res.headers.get('location')).toBeNull()
    expect(res.cookies.set).toHaveBeenCalledWith(
      'gospel-profile-text-size',
      'larger',
      expect.objectContaining({ path: '/', sameSite: 'lax' })
    )
  })

  test('sets both preference cookies when translation and text size are in the URL', async () => {
    const res = await proxy(
      makeReq(
        '/default/read/',
        'https://example.com/default/read/?translation=kjv&textSize=largest'
      ) as any
    )
    expect(res.cookies.set).toHaveBeenCalledWith(
      'gospel-preferred-translation',
      'kjv',
      expect.objectContaining({ path: '/' })
    )
    expect(res.cookies.set).toHaveBeenCalledWith(
      'gospel-profile-text-size',
      'largest',
      expect.objectContaining({ path: '/' })
    )
  })
})
