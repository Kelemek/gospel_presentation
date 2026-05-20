import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/calvin/by-reference', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when reference missing', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(new NextRequest('http://localhost/api/calvin/by-reference'))
    expect(res.status).toBe(400)
  })

  it('returns Calvin books sorted by title', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'spurgeon_passage_index') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: [{ profile_id: 'p1' }], error: null }),
            or: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          like: jest.fn((_col: string, pattern: string) =>
            Promise.resolve({
              data:
                pattern === 'cv%'
                  ? [
                      { slug: 'cvrom', title: 'Calvin on Romans' },
                      { slug: 'cvgen', title: 'Calvin on Genesis' },
                    ]
                  : [],
              error: null,
            })
          ),
        }
      }
      return {}
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/calvin/by-reference?reference=Genesis%201:1')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items[0].slug).toBe('cvgen')
    expect(body.items[1].slug).toBe('cvrom')
  })
})
