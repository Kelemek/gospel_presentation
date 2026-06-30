jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn((url, key, opts) => {
    // Return the cookies helper object so tests can call it directly
    return opts && opts.cookies ? opts.cookies : { getAll: () => [] }
  }),
}))

describe('supabase server cookie helpers', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('handles cookieStore.set throwing without crashing', async () => {
    jest.doMock('next/headers', () => ({
      cookies: jest.fn(() => ({
        getAll: () => [{ name: 'a', value: 'cookie-a' }],
        set: () => {
          throw new Error('set failed')
        },
      })),
    }))

    let createClient: any
    jest.isolateModules(() => {
      createClient = require('../server').createClient
    })

    const clientCookies = await createClient()

    expect(typeof clientCookies.getAll).toBe('function')
    expect(() => clientCookies.setAll([{ name: 'a', value: 'b', options: {} }])).not.toThrow()
  })

  it('createAdminClient returns cookie helpers that are no-ops', () => {
    jest.resetModules()
    jest.clearAllMocks()

    let createAdminClient: any
    jest.isolateModules(() => {
      createAdminClient = require('../server').createAdminClient
    })

    const client = createAdminClient()
    expect(typeof client.getAll).toBe('function')
    expect(client.getAll()).toEqual([])
    expect(typeof client.setAll).toBe('function')
    expect(() => client.setAll([{ name: 'a', value: 'b', options: {} }])).not.toThrow()
  })
})
