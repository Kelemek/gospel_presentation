import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { mockSupabasePublicProfilesChain } from '@/lib/testHelpers/mockSupabasePublicProfilesChain'
import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/books/by-reference', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when reference missing', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(new NextRequest('http://localhost/api/books/by-reference'))
    expect(res.status).toBe(400)
  })

  it('returns indexed book templates excluding library corpora', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'spurgeon_passage_index') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: [{ profile_id: 'pLbst' }, { profile_id: 'pSg' }],
              error: null,
            }),
            or: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        }
      }
      if (table === 'profiles') {
        return mockSupabasePublicProfilesChain([
          { slug: 'lbst', title: 'Systematic Theology (Louis Berkhof)' },
          { slug: 'sg00001', title: 'Sermon' },
        ])
      }
      return {}
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/books/by-reference?reference=Romans%203:23')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([
      { slug: 'lbst', title: 'Systematic Theology (Louis Berkhof)' },
    ])
  })
})
