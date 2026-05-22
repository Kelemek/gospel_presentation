import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/henry/books', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('lists public mh profiles in canon order with pagination', async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        { slug: 'mhrom', title: 'Matthew Henry on Romans' },
        { slug: 'mhgen', title: 'Matthew Henry on Genesis' },
      ],
      error: null,
      count: 2,
    })
    const ilike = jest.fn(() => ({ order }))

    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              ilike,
            }),
          }),
        }),
      }),
    } as never)

    const res = await GET(new NextRequest('http://localhost/api/henry/books?page=1&pageSize=10'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([
      { slug: 'mhgen', title: 'Matthew Henry on Genesis' },
      { slug: 'mhrom', title: 'Matthew Henry on Romans' },
    ])
    expect(body.total).toBe(2)
    expect(ilike).toHaveBeenCalledWith('slug', 'mh%')
    expect(order).toHaveBeenCalledWith('slug', { ascending: true })
  })
})
