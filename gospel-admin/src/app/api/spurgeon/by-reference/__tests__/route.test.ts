import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/spurgeon/by-reference', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when reference missing', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(new NextRequest('http://localhost/api/spurgeon/by-reference'))
    expect(res.status).toBe(400)
  })

  it('returns profiles for index hits', async () => {
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
      new NextRequest('http://localhost/api/spurgeon/by-reference?reference=John%203:16')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([{ slug: 'sg00001', title: 'Sermon' }])
  })

  it('sorts multiple hits A–Z by display title (stripped Sermon N.)', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'spurgeon_passage_index') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: [{ profile_id: 'p1' }, { profile_id: 'p2' }, { profile_id: 'p3' }],
            error: null,
          }),
        }
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          like: jest.fn().mockResolvedValue({
            data: [
              { slug: 'sg00003', title: 'Sermon 3. Zebra' },
              { slug: 'sg00001', title: 'Sermon 1. Ant' },
              { slug: 'sg00002', title: 'Sermon 2. Boat' },
            ],
            error: null,
          }),
        }
      }
      return {}
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/spurgeon/by-reference?reference=Rom%208:28')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.map((x: { slug: string }) => x.slug)).toEqual(['sg00001', 'sg00002', 'sg00003'])
  })
})
