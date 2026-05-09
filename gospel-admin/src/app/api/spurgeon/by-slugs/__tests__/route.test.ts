import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/spurgeon/by-slugs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty items when slugs param is missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/spurgeon/by-slugs'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('returns empty when no valid sg slugs', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/spurgeon/by-slugs?slugs=foo,bar')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
    expect(mockCreateAdminClient).not.toHaveBeenCalled()
  })

  it('queries profiles for valid slugs and returns sorted items', async () => {
    const rows = [
      { slug: 'sg00002', title: 'Sermon 2. Beta' },
      { slug: 'sg00001', title: 'Sermon 1. Alpha' },
    ]
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          in: (col: string, slugs: string[]) => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      }),
    } as never)

    const res = await GET(
      new NextRequest(
        'http://localhost/api/spurgeon/by-slugs?slugs=sg00001,not-a-sermon,sg00002'
      )
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(2)
    expect(body.items[0].slug).toBe('sg00001')
    expect(body.items[1].slug).toBe('sg00002')
  })
})
