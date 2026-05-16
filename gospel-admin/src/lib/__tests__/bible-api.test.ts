import { fetchScripture } from '@/lib/bible-api'

describe('fetchScripture', () => {
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
  })

  afterEach(() => {
    process.env = originalEnv
    global.fetch = originalFetch
  })

  it('throws API.Bible error for KJV when remote returns 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    await expect(fetchScripture('Genesis 1:1', 'kjv')).rejects.toThrow('API.Bible error: 500')
  })

  it('throws API.Bible error for NIV when remote returns 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    await expect(fetchScripture('John 3:16', 'niv')).rejects.toThrow('API.Bible error: 500')
  })
})
