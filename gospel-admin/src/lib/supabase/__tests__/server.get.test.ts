jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((url, key, opts) => {
    return opts && opts.cookies ? opts.cookies : { get: () => undefined }
  }),
}))

describe('supabase server cookie helpers - get path', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('returns cookie value via cookies.get helper', async () => {
    jest.doMock('next/headers', () => ({
      cookies: jest.fn(() => ({
        get: (name: string) => ({ value: `cookie-${name}` }),
        set: () => {},
        remove: () => {}
      })),
    }))

    let createClient: any
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      createClient = require('../server').createClient
    })

    const clientCookies = await createClient()
    expect(clientCookies.get('foo')).toBe('cookie-foo')
  })
})
