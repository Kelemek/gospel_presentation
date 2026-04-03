import { fetchScripture } from '@/lib/bible-api'

const mockFrom = jest.fn()
const mockCreateAdminClient = jest.fn(() => ({ from: mockFrom }))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}))

describe('fetchScripture API.Bible cutover', () => {
  const originalEnv = process.env
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      API_BIBLE_KEY: 'test-api-key',
      API_BIBLE_BASE_URL: 'https://rest.api.bible',
      API_BIBLE_BIBLE_ID_KJV: 'de4e12af7f28f599-02',
      API_BIBLE_BIBLE_ID_NASB: 'b8ee27bcd1cae43a-01',
      API_BIBLE_BIBLE_ID_LSB: '8011347e1aa60e8a-01',
      API_BIBLE_BIBLE_ID_NIV: '78a9f6124f344018-01',
      API_BIBLE_BIBLE_ID_NLT: 'd6e14a625393b4da-01',
      API_BIBLE_BIBLE_ID_CSB: 'a556c5305ee15c3f-01',
    }

    const builder: any = {
      select: jest.fn(() => builder),
      eq: jest.fn(() => builder),
      order: jest.fn(() => builder),
      gte: jest.fn(() => builder),
      lte: jest.fn(() => builder),
      then: (resolve: (v: unknown) => void) =>
        resolve({
          data: [{ verse: 1, text: 'In the beginning God created the heaven and the earth.' }],
          error: null,
        }),
    }

    mockFrom.mockReturnValue(builder)
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it('falls back to local DB for KJV when API.Bible fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    const result = await fetchScripture('Genesis 1:1', 'kjv')

    expect(result.translation).toBe('kjv')
    expect(result.reference).toBe('Genesis 1:1')
    expect(result.text).toContain('[1]')
    expect(mockFrom).toHaveBeenCalledWith('bible_verses')
  })

  it('does not fall back for NIV when API.Bible fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    await expect(fetchScripture('John 3:16', 'niv')).rejects.toThrow('API.Bible error: 500')
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
