import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/edwards/sermons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns paginated je sermon list', async () => {
    const from = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockResolvedValue({
        data: [
          { slug: 'je02', title: 'B Sermon' },
          { slug: 'je01', title: 'A Sermon' },
        ],
        count: 2,
        error: null,
      }),
      or: jest.fn().mockReturnThis(),
    }))
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(new NextRequest('http://localhost/api/edwards/sermons?page=1&pageSize=10'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.total).toBe(2)
    expect(body.items.map((x: { slug: string }) => x.slug)).toEqual(['je01', 'je02'])
  })
})
