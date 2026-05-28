import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), debug: jest.fn(), warn: jest.fn(), info: jest.fn() },
}))

import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

function mockMorneveSupabase(
  indexProfileIds: { profile_id: string }[],
  profiles: { slug: string; title: string | null }[]
) {
  const from = jest.fn((table: string) => {
    if (table === 'spurgeon_passage_index') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn().mockResolvedValue({ data: indexProfileIds, error: null }),
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
            data: pattern === 'me%' ? profiles : [],
            error: null,
          })
        ),
      }
    }
    return {}
  })
  mockCreateAdminClient.mockReturnValue({ from } as never)
}

describe('GET /api/morneve/by-reference', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 400 when reference is missing', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(new NextRequest('http://localhost/api/morneve/by-reference'))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('reference is required')
  })

  it('returns 400 when reference is whitespace only', async () => {
    mockCreateAdminClient.mockReturnValue({ from: jest.fn() } as never)
    const res = await GET(
      new NextRequest('http://localhost/api/morneve/by-reference?reference=%20%20')
    )
    expect(res.status).toBe(400)
  })

  it('returns Morning & Evening days sorted by calendar (MMDD)', async () => {
    mockMorneveSupabase([{ profile_id: 'p1' }, { profile_id: 'p2' }, { profile_id: 'p3' }], [
      { slug: 'me1231', title: 'December 31' },
      { slug: 'me0101', title: 'January 1' },
      { slug: 'me0315', title: 'March 15' },
    ])

    const res = await GET(
      new NextRequest('http://localhost/api/morneve/by-reference?reference=John%203:16')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.map((x: { slug: string }) => x.slug)).toEqual(['me0101', 'me0315', 'me1231'])
    expect(body.items[0].title).toBe('January 1')
  })

  it('uses slug as title when title is empty', async () => {
    mockMorneveSupabase([{ profile_id: 'p1' }], [{ slug: 'me0229', title: '' }])

    const res = await GET(
      new NextRequest('http://localhost/api/morneve/by-reference?reference=Romans%208:28')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([{ slug: 'me0229', title: 'me0229' }])
  })

  it('returns empty items when passage index has no hits', async () => {
    mockMorneveSupabase([], [])

    const res = await GET(
      new NextRequest('http://localhost/api/morneve/by-reference?reference=Obadiah%201')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([])
  })

  it('returns 500 and logs when lookup throws', async () => {
    const from = jest.fn(() => {
      throw new Error('db down')
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/morneve/by-reference?reference=Genesis%201:1')
    )
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Lookup failed')
    expect(logger.error).toHaveBeenCalledWith(
      '[API] GET /api/morneve/by-reference',
      expect.any(Error)
    )
  })

  it('filters to me* public template profiles only', async () => {
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
          like: jest.fn((_col: string, pattern: string) => {
            expect(pattern).toBe('me%')
            return Promise.resolve({
              data: [{ slug: 'me0101', title: 'Jan 1' }],
              error: null,
            })
          }),
        }
      }
      return {}
    })
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/morneve/by-reference?reference=John%203:16')
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
  })
})
