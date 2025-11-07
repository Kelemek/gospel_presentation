jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((url, key, opts) => {
    // Return the cookies helper object so tests can call it directly
    return opts && opts.cookies ? opts.cookies : { get: () => undefined }
  }),
}))

describe('supabase server cookie helpers', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('handles cookieStore.set throwing without crashing', async () => {
    // Mock next/headers cookies() to provide a cookieStore whose set throws
    jest.doMock('next/headers', () => ({
      cookies: jest.fn(() => ({
        get: (name: string) => ({ value: `cookie-${name}` }),
        set: () => { throw new Error('set failed') },
        remove: () => { throw new Error('remove failed') },
      })),
    }))

    let createClient: any
    jest.isolateModules(() => {
      // Import the module after mocking next/headers so the mock is used
      // eslint-disable-next-line global-require
      createClient = require('../server').createClient
    })

    const clientCookies = await createClient()

    // calling the cookie helpers should not throw (createClient wraps set/remove in try/catch)
    expect(typeof clientCookies.get).toBe('function')
    expect(() => clientCookies.set('a', 'b', {})).not.toThrow()
    expect(() => clientCookies.remove('a', {})).not.toThrow()
  })

  it('createAdminClient returns cookie helpers that are no-ops', () => {
    jest.resetModules()
    jest.clearAllMocks()

    // module-level mock above returns opts.cookies when createServerClient is called
    let createAdminClient: any
    jest.isolateModules(() => {
      // eslint-disable-next-line global-require
      createAdminClient = require('../server').createAdminClient
    })

    const client = createAdminClient()
    expect(typeof client.get).toBe('function')
    // admin get should return undefined
    expect(client.get('any')).toBeUndefined()
    expect(typeof client.set).toBe('function')
    expect(() => client.set('a', 'b', {})).not.toThrow()
    expect(typeof client.remove).toBe('function')
    expect(() => client.remove('a', {})).not.toThrow()
  })
})
