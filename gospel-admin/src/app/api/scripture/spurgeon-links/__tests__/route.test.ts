import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/scripture/spurgeon-links', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when reference missing', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(new NextRequest('http://localhost/api/scripture/spurgeon-links'))
    expect(res.status).toBe(400)
  })

  it('queries index then profiles and caps sorted results', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'spurgeon_passage_index') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [{ profile_id: 'p1' }], error: null }),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          like: jest.fn().mockResolvedValue({
            data: [{ slug: 'sg00001', title: 'Sermon' }],
            error: null,
          }),
        }
      }
      return {}
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/scripture/spurgeon-links?reference=Romans%208:28')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([{ slug: 'sg00001', title: 'Sermon' }])
  })
})
