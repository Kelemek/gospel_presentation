import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('GET /api/edwards/by-reference', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when reference missing', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(new NextRequest('http://localhost/api/edwards/by-reference'))
    expect(res.status).toBe(400)
  })

  it('returns je profiles for index hits', async () => {
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
          like: jest.fn().mockResolvedValue({
            data: [{ slug: 'je01', title: 'Sinners in the Hands of an Angry God' }],
            error: null,
          }),
        }
      }
      return {}
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/edwards/by-reference?reference=Deuteronomy%2032:35')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([
      { slug: 'je01', title: 'Sinners in the Hands of an Angry God' },
    ])
  })

  it('returns je profiles for partial book name (book-prefix scan scoped to je)', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'spurgeon_passage_index') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(),
            or: jest.fn(() => ({
              limit: jest.fn(() => ({
                in: jest.fn().mockResolvedValue({
                  data: [{ profile_id: 'pJe' }],
                  error: null,
                }),
              })),
            })),
          })),
        }
      }
      if (table === 'profiles') {
        const slugListResult = {
          data: [{ id: 'pJe' }],
          error: null,
        }
        const sermonListResult = {
          data: [{ slug: 'je01', title: 'Sinners in the Hands of an Angry God' }],
          error: null,
        }
        return {
          select: jest.fn((cols: string) => {
            if (cols === 'id') {
              return {
                like: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    eq: jest.fn().mockResolvedValue(slugListResult),
                  })),
                })),
              }
            }
            return {
              in: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    like: jest.fn().mockResolvedValue(sermonListResult),
                  })),
                })),
              })),
            }
          }),
        }
      }
      return {}
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/edwards/by-reference?reference=dut')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([
      { slug: 'je01', title: 'Sinners in the Hands of an Angry God' },
    ])
  })
})
