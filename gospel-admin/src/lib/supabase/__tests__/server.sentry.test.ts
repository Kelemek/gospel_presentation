// Mock Sentry first
const mockAddBreadcrumb = jest.fn()
jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: mockAddBreadcrumb,
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) => ({ value: `cookie-${name}` }),
    set: jest.fn(),
  })),
}))

describe('supabase server - Sentry breadcrumbs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
  })

  it('createClient adds Sentry breadcrumbs when calling from()', async () => {
    // Mock createServerClient to return a client with a real from method
    const mockFrom = jest.fn((table: string) => ({
      tableName: table,
      select: jest.fn(),
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn(() => ({
        from: mockFrom,
      })),
    }))

    const { createClient } = await import('../server')
    const client = await createClient()

    // Call the from method - this should trigger the wrapped version
    const query = client.from('users')

    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'supabase',
      message: 'Query table: users',
      level: 'info',
    })
    expect(query).toHaveProperty('tableName', 'users')
  })

  it('createAdminClient adds Sentry breadcrumbs when calling from()', async () => {
    // Mock createServerClient to return a client with a real from method
    const mockFrom = jest.fn((table: string) => ({
      tableName: table,
      select: jest.fn(),
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn(() => ({
        from: mockFrom,
      })),
    }))

    const { createAdminClient } = await import('../server')
    const client = createAdminClient()

    // Call the from method
    const query = client.from('profiles')

    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'supabase',
      message: 'Admin query table: profiles',
      level: 'info',
    })
    expect(query).toHaveProperty('tableName', 'profiles')
  })

  it('createClient skips Sentry breadcrumbs when from is not a function', async () => {
    // Mock createServerClient to return a client without a from method
    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn(() => ({
        from: null, // Not a function
      })),
    }))

    const { createClient } = await import('../server')
    const client = await createClient()

    expect(mockAddBreadcrumb).not.toHaveBeenCalled()
    expect(client.from).toBeNull()
  })

  it('createAdminClient skips Sentry breadcrumbs when from is not a function', async () => {
    // Mock createServerClient to return a client without a from method
    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn(() => ({
        from: undefined, // Not a function
      })),
    }))

    const { createAdminClient } = await import('../server')
    const client = createAdminClient()

    expect(mockAddBreadcrumb).not.toHaveBeenCalled()
    expect(client.from).toBeUndefined()
  })

  it('createClient preserves original from behavior', async () => {
    const mockSelect = jest.fn().mockReturnValue({ data: [], error: null })
    const mockFrom = jest.fn((table: string) => ({
      tableName: table,
      select: mockSelect,
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn(() => ({
        from: mockFrom,
      })),
    }))

    const { createClient } = await import('../server')
    const client = await createClient()

    // Call from and ensure it works correctly
    const query = client.from('test_table')
    query.select()

    expect(mockSelect).toHaveBeenCalled()
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'supabase',
      message: 'Query table: test_table',
      level: 'info',
    })
  })

  it('createAdminClient preserves original from behavior', async () => {
    const mockSelect = jest.fn().mockReturnValue({ data: [], error: null })
    const mockFrom = jest.fn((table: string) => ({
      tableName: table,
      select: mockSelect,
    }))

    jest.doMock('@supabase/ssr', () => ({
      createServerClient: jest.fn(() => ({
        from: mockFrom,
      })),
    }))

    const { createAdminClient } = await import('../server')
    const client = createAdminClient()

    // Call from and ensure it works correctly
    const query = client.from('admin_table')
    query.select()

    expect(mockSelect).toHaveBeenCalled()
    expect(mockAddBreadcrumb).toHaveBeenCalledWith({
      category: 'supabase',
      message: 'Admin query table: admin_table',
      level: 'info',
    })
  })
})
