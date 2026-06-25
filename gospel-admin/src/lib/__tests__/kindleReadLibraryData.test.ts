import {
  fetchKindleReadLibraryPage,
  kindleReadLibraryIndexUrl,
} from '@/lib/kindleReadLibraryData'

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>

describe('kindleReadLibraryIndexUrl', () => {
  it('includes q, page, and from in query string', () => {
    expect(kindleReadLibraryIndexUrl('spurgeon', 2, 'default', 'grace')).toBe(
      '/read/libraries/spurgeon/?page=2&q=grace&from=default'
    )
  })

  it('omits q when query normalizes to empty', () => {
    expect(kindleReadLibraryIndexUrl('edwards', 1, 'default', '   ')).toBe(
      '/read/libraries/edwards/?from=default'
    )
  })
})

describe('fetchKindleReadLibraryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('passes search query to spurgeon RPC', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { total: 1, items: [{ slug: 'sg00001', title: 'Sermon 1. Grace' }] },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({ rpc } as never)

    const page = await fetchKindleReadLibraryPage('spurgeon', 1, 50, 'grace')

    expect(rpc).toHaveBeenCalledWith('spurgeon_public_sermons_page', {
      p_q: 'grace',
      p_offset: 0,
      p_limit: 50,
    })
    expect(page.query).toBe('grace')
    expect(page.items[0]?.slug).toBe('sg00001')
  })

  it('passes null p_q when browsing all Spurgeon sermons', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: { total: 0, items: [] },
      error: null,
    })
    mockCreateAdminClient.mockReturnValue({ rpc } as never)

    await fetchKindleReadLibraryPage('spurgeon', 1)

    expect(rpc).toHaveBeenCalledWith('spurgeon_public_sermons_page', {
      p_q: null,
      p_offset: 0,
      p_limit: 50,
    })
  })

  it('filters Edwards sermons with ilike when q is set', async () => {
    const or = jest.fn().mockResolvedValue({
      data: [{ slug: 'je01', title: 'Sinners in the Hands of an Angry God' }],
      error: null,
    })
    const filter = jest.fn().mockReturnValue({ or })
    const eqChain = { eq: jest.fn().mockReturnThis(), filter }
    eqChain.eq.mockReturnValue(eqChain)
    const select = jest.fn().mockReturnValue(eqChain)
    const from = jest.fn(() => ({ select }))
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const page = await fetchKindleReadLibraryPage('edwards', 1, 50, 'sinners')

    expect(or).toHaveBeenCalled()
    expect(page.query).toBe('sinners')
    expect(page.items).toHaveLength(1)
    expect(page.items[0]?.slug).toBe('je01')
  })

  it('filters small corpora in memory for calvin', async () => {
    const ilike = jest.fn().mockResolvedValue({
      data: [
        { slug: 'cvgen', title: 'Genesis' },
        { slug: 'cvrom', title: 'Romans' },
      ],
      error: null,
    })
    const eqChain = { eq: jest.fn().mockReturnThis(), ilike }
    eqChain.eq.mockReturnValue(eqChain)
    const select = jest.fn().mockReturnValue(eqChain)
    const from = jest.fn(() => ({ select }))
    mockCreateAdminClient.mockReturnValue({ from } as never)

    const page = await fetchKindleReadLibraryPage('calvin', 1, 50, 'rom')

    expect(page.total).toBe(1)
    expect(page.items[0]?.slug).toBe('cvrom')
    expect(page.query).toBe('rom')
  })
})
