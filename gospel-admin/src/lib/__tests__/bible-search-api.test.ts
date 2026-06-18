import {
  bibleSearchSnippetForDisplay,
  bibleSearchSnippetFromText,
  clampBibleSearchPageSize,
  searchBible,
} from '../bible-search-api'

describe('bible-search-api', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    delete process.env.ESV_API_TOKEN
    delete process.env.API_BIBLE_KEY
    delete process.env.API_BIBLE_BIBLE_ID_KJV
  })

  describe('clampBibleSearchPageSize', () => {
    it('clamps to 1..50 with default for invalid', () => {
      expect(clampBibleSearchPageSize(0)).toBe(20)
      expect(clampBibleSearchPageSize(100)).toBe(50)
      expect(clampBibleSearchPageSize(25)).toBe(25)
    })
  })

  describe('bibleSearchSnippetFromText', () => {
    it('strips verse numbers and truncates long text', () => {
      const long = `[1] ${'word '.repeat(80)}`
      const snippet = bibleSearchSnippetFromText(long, 40)
      expect(snippet).not.toMatch(/^\[1\]/)
      expect(snippet.endsWith('…')).toBe(true)
    })
  })

  describe('bibleSearchSnippetForDisplay', () => {
    it('normalizes and caps snippet length for the modal', () => {
      expect(bibleSearchSnippetForDisplay('Short verse')).toBe('Short verse')
      expect(bibleSearchSnippetForDisplay('Long verse text…')).toBe('Long verse text')
      const long = 'x'.repeat(200)
      expect(bibleSearchSnippetForDisplay(long).endsWith('…')).toBe(true)
      expect(bibleSearchSnippetForDisplay(long).length).toBe(170)
    })
  })

  describe('searchBible ESV', () => {
    it('rejects short queries', async () => {
      await expect(searchBible('ab', 'esv')).rejects.toThrow(/at least 3/)
    })

    it('maps ESV search response', async () => {
      process.env.ESV_API_TOKEN = 'token'
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          page: 1,
          total_results: 2,
          total_pages: 1,
          results: [
            { reference: 'John 3:16', content: 'For God so loved the world.' },
            { reference: 'Romans 5:8', content: 'But God shows his love.' },
          ],
        }),
      })) as jest.Mock

      const page = await searchBible('love', 'esv', 1, 20)
      expect(page.translation).toBe('esv')
      expect(page.total).toBe(2)
      expect(page.items).toHaveLength(2)
      expect(page.items[0]?.reference).toBe('John 3:16')
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.esv.org/v3/passage/search/'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Token token' }),
        })
      )
    })
  })

  describe('searchBible API.Bible', () => {
    it('maps API.Bible search response', async () => {
      process.env.API_BIBLE_KEY = 'key'
      process.env.API_BIBLE_BIBLE_ID_KJV = 'bible-kjv'
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            total: 1,
            verses: [{ reference: 'Psalm 23:1', content: 'The LORD is my shepherd;' }],
          },
        }),
      })) as jest.Mock

      const page = await searchBible('shepherd', 'kjv', 1, 10)
      expect(page.translation).toBe('kjv')
      expect(page.items).toHaveLength(1)
      expect(page.items[0]?.snippet).toContain('shepherd')
    })
  })
})
