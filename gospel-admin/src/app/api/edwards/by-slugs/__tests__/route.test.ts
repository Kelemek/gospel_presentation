import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/edwards/by-slugs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty for invalid slugs', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(new NextRequest('http://localhost/api/edwards/by-slugs?slugs=default'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: [] })
  })

  it('returns public je profiles', async () => {
    const rows = [
      { slug: 'je02', title: 'A Divine and Supernatural Light' },
      { slug: 'je01', title: 'Sinners in the Hands of an Angry God' },
    ]
    mockCreateAdminClient.mockReturnValue({
      from: () => ({
        select: () => ({
          in: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: rows, error: null }),
            }),
          }),
        }),
      }),
    } as never)
    const res = await GET(new NextRequest('http://localhost/api/edwards/by-slugs?slugs=je02,je01'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.map((x: { slug: string }) => x.slug)).toEqual(['je02', 'je01'])
  })
})
