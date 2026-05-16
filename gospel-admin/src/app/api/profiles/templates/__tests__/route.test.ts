import { GET } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}))

jest.mock('@/lib/supabase/server')

const templateRow = {
  id: 'p1',
  slug: 's1',
  title: 'T',
  description: null,
  is_default: false,
  is_template: true,
  is_public: false,
  visit_count: 0,
  last_visited: null,
  created_at: new Date('2020-01-01').toISOString(),
  updated_at: new Date('2020-01-02').toISOString(),
  created_by: null as string | null,
}

function setupSupabaseMocks(role: 'admin' | 'user' | 'counselor' | null, opts?: { withSearch?: boolean; totalCount?: number }) {
  const totalCount = opts?.totalCount ?? 1250
  const range = jest.fn().mockResolvedValue({
    data: [templateRow],
    error: null,
    count: totalCount,
  })
  const rangeable = { range, or: jest.fn(() => ({ range })) }
  const profileSelect = jest.fn(() => ({
    eq: jest.fn(() => ({
      order: jest.fn(() => ({
        order: jest.fn(() => rangeable),
      })),
    })),
  }))

  const mockFrom = jest.fn((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: jest.fn((cols: string) => {
          if (cols === 'role') {
            return {
              eq: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: role ? { role } : null,
                  error: role ? null : { message: 'not found' },
                }),
              })),
            }
          }
          if (cols === 'id' && opts?.withSearch) {
            return {
              or: jest.fn().mockResolvedValue({ data: [{ id: 'owner-1' }], error: null }),
            }
          }
          throw new Error(`unexpected user_profiles select: ${cols}`)
        }),
      }
    }
    if (table === 'profiles') {
      return { select: profileSelect }
    }
    throw new Error(`unexpected table: ${table}`)
  })

  const client = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: mockFrom,
  }

  const server = require('@/lib/supabase/server') as {
    createClient: jest.Mock
    createAdminClient: jest.Mock
  }
  server.createClient.mockResolvedValue(client)
  server.createAdminClient.mockReturnValue({
    ...client,
    auth: {
      ...client.auth,
      admin: { listUsers: jest.fn().mockResolvedValue({ data: { users: [] }, error: null }) },
    },
  })
}

describe('GET /api/profiles/templates', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const server = require('@/lib/supabase/server') as { createClient: jest.Mock }
    server.createClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    })

    const res = await GET(new NextRequest('http://localhost/api/profiles/templates?page=1&pageSize=30'))
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not admin', async () => {
    setupSupabaseMocks('user')
    const res = await GET(new NextRequest('http://localhost/api/profiles/templates?page=1&pageSize=30'))
    expect(res.status).toBe(403)
  })

  it('returns 403 for legacy counselor DB role', async () => {
    setupSupabaseMocks('counselor')
    const res = await GET(new NextRequest('http://localhost/api/profiles/templates?page=2&pageSize=10'))
    expect(res.status).toBe(403)
  })

  it('returns paginated template list for admin', async () => {
    setupSupabaseMocks('admin')
    const res = await GET(new NextRequest('http://localhost/api/profiles/templates?page=1&pageSize=30'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.total).toBe(1250)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(30)
    expect(body.totalPages).toBe(42)
    expect(body.profiles).toHaveLength(1)
    expect(body.profiles[0].slug).toBe('s1')
    expect(body.profiles[0].isTemplate).toBe(true)
  })

  it('clamps pageSize to max 100', async () => {
    setupSupabaseMocks('admin')
    const res = await GET(new NextRequest('http://localhost/api/profiles/templates?page=1&pageSize=500'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.pageSize).toBe(100)
  })

  it('applies search filter path when q is present', async () => {
    setupSupabaseMocks('admin', { withSearch: true })
    const res = await GET(new NextRequest('http://localhost/api/profiles/templates?page=1&pageSize=30&q=foo'))
    expect(res.status).toBe(200)
    const server = require('@/lib/supabase/server') as { createAdminClient: jest.Mock }
    const admin = server.createAdminClient.mock.results[0]?.value
    const fromCalls = admin?.from?.mock?.calls?.map((c: unknown[]) => c[0]) ?? []
    expect(fromCalls).toContain('user_profiles')
    expect(fromCalls.filter((t: string) => t === 'user_profiles').length).toBeGreaterThanOrEqual(2)
  })
})
