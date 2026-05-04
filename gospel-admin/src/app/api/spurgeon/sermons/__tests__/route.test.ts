import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

function mockRpc(result: { data: unknown; error: unknown }) {
  const rpc = jest.fn().mockResolvedValue(result)
  return { rpc }
}

describe('GET /api/spurgeon/sermons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns sermons and pagination metadata via RPC', async () => {
    const { rpc } = mockRpc({
      data: { total: 1, items: [{ slug: 'sg00001', title: 'Sermon A' }] },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({ rpc } as never)

    const res = await GET(new NextRequest('http://localhost/api/spurgeon/sermons?page=1&pageSize=20'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([{ slug: 'sg00001', title: 'Sermon A' }])
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(20)
    expect(rpc).toHaveBeenCalledWith('spurgeon_public_sermons_page', {
      p_q: null,
      p_offset: 0,
      p_limit: 20,
    })
  })

  it('passes search text to RPC when q is present', async () => {
    const { rpc } = mockRpc({
      data: { total: 0, items: [] },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({ rpc } as never)

    const res = await GET(new NextRequest('http://localhost/api/spurgeon/sermons?q=grace'))
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('spurgeon_public_sermons_page', {
      p_q: 'grace',
      p_offset: 0,
      p_limit: 20,
    })
    await res.json()
  })

  it('requests correct offset for pages beyond a 2500-row fetch cap (full-corpus pagination)', async () => {
    const { rpc } = mockRpc({
      data: { total: 3600, items: [{ slug: 'sg03501', title: 'Sermon 3501.' }] },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({ rpc } as never)

    const res = await GET(
      new NextRequest('http://localhost/api/spurgeon/sermons?page=101&pageSize=25')
    )
    expect(res.status).toBe(200)
    expect(rpc).toHaveBeenCalledWith('spurgeon_public_sermons_page', {
      p_q: null,
      p_offset: 2500,
      p_limit: 25,
    })
    const body = await res.json()
    expect(body.total).toBe(3600)
    expect(body.items).toHaveLength(1)
    expect(body.items[0].slug).toBe('sg03501')
  })

  it('returns RPC rows in DB order (A–Z by display title after stripping Sermon N.)', async () => {
    const { rpc } = mockRpc({
      data: {
        total: 3,
        items: [
          { slug: 'sg00002', title: 'Sermon 2. Alpha sermon' },
          { slug: 'sg00001', title: 'Sermon 1. Beta lesson' },
          { slug: 'sg09999', title: 'Sermon 999. Zebra talk' },
        ],
      },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({ rpc } as never)

    const res = await GET(new NextRequest('http://localhost/api/spurgeon/sermons?page=1&pageSize=20'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items.map((x: { slug: string }) => x.slug)).toEqual(['sg00002', 'sg00001', 'sg09999'])
  })
})
