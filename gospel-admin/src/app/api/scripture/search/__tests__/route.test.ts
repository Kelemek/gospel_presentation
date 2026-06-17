import { GET } from '../route'
import { searchBible } from '@/lib/bible-search-api'
import { isTranslationEnabled } from '@/lib/isTranslationEnabled'

jest.mock('@/lib/bible-search-api', () => ({
  ...jest.requireActual('@/lib/bible-search-api'),
  searchBible: jest.fn(),
}))

jest.mock('@/lib/isTranslationEnabled', () => ({
  isTranslationEnabled: jest.fn(),
}))

const mockSearchBible = searchBible as jest.MockedFunction<typeof searchBible>
const mockIsTranslationEnabled = isTranslationEnabled as jest.MockedFunction<
  typeof isTranslationEnabled
>

describe('GET /api/scripture/search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsTranslationEnabled.mockResolvedValue(true)
  })

  it('returns 400 when query missing', async () => {
    const req = { url: 'https://example.com/api/scripture/search?translation=esv' } as Request
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when query too short', async () => {
    const req = {
      url: 'https://example.com/api/scripture/search?q=ab&translation=esv',
    } as Request
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns 400 when translation disabled', async () => {
    mockIsTranslationEnabled.mockResolvedValue(false)
    const req = {
      url: 'https://example.com/api/scripture/search?q=grace&translation=nasb',
    } as Request
    const res = await GET(req as never)
    expect(res.status).toBe(400)
  })

  it('returns search results', async () => {
    mockSearchBible.mockResolvedValue({
      translation: 'esv',
      query: 'grace',
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      items: [{ reference: 'Ephesians 2:8', snippet: 'For by grace you have been saved' }],
    })

    const req = {
      url: 'https://example.com/api/scripture/search?q=grace&translation=esv',
    } as Request
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(mockSearchBible).toHaveBeenCalledWith('grace', 'esv', 1, 20)
  })
})
