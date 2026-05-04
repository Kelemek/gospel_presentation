import { NextRequest } from 'next/server'
import { GET } from '../route'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

function mockProfilesChain(result: { data: unknown; error: unknown; count?: number }) {
  const range = jest.fn().mockResolvedValue(result)
  const tail = { range }
  const chain: {
    select: jest.Mock
    eq: jest.Mock
    like: jest.Mock
    order: jest.Mock
    or: jest.Mock
  } = {
    select: jest.fn(),
    eq: jest.fn(),
    like: jest.fn(),
    order: jest.fn(),
    or: jest.fn(),
  }
  chain.select.mockImplementation(() => chain)
  chain.eq.mockImplementation(() => chain)
  chain.like.mockImplementation(() => chain)
  chain.order.mockImplementation(() => tail)
  chain.or.mockImplementation(() => chain)
  return { chain, orFn: chain.or, range }
}

describe('GET /api/spurgeon/sermons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns sermons and pagination metadata', async () => {
    const { chain } = mockProfilesChain({
      data: [{ slug: 'sg00001', title: 'Sermon A' }],
      error: null,
      count: 1,
    })
    mockCreateAdminClient.mockReturnValue({ from: jest.fn(() => chain) } as never)

    const res = await GET(new NextRequest('http://localhost/api/spurgeon/sermons?page=1&pageSize=20'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toEqual([{ slug: 'sg00001', title: 'Sermon A' }])
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(body.pageSize).toBe(20)
  })

  it('passes search pattern when q is present', async () => {
    const { chain, orFn } = mockProfilesChain({
      data: [],
      error: null,
      count: 0,
    })
    mockCreateAdminClient.mockReturnValue({ from: jest.fn(() => chain) } as never)

    const res = await GET(new NextRequest('http://localhost/api/spurgeon/sermons?q=grace'))
    expect(res.status).toBe(200)
    expect(orFn).toHaveBeenCalledWith('title.ilike."%grace%",slug.ilike."%grace%"')
    await res.json()
  })
})
