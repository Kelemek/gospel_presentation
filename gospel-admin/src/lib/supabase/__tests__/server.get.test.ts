jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((url, key, opts) => {
    return opts && opts.cookies ? opts.cookies : { getAll: () => [] }
  }),
}))

describe('supabase server cookie helpers - getAll path', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('returns cookies via cookies.getAll helper', async () => {
    jest.doMock('next/headers', () => ({
      cookies: jest.fn(() => ({
        getAll: () => [{ name: 'foo', value: 'cookie-foo' }],
        set: () => {},
      })),
    }))

    let createClient: any
    jest.isolateModules(() => {
      createClient = require('../server').createClient
    })

    const clientCookies = await createClient()
    expect(clientCookies.getAll()).toEqual([{ name: 'foo', value: 'cookie-foo' }])
  })
})
