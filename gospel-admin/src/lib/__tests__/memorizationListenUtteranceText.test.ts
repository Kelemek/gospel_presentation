import { getMemorizationListenUtteranceText } from '@/lib/memorizationListenUtteranceText'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

describe('getMemorizationListenUtteranceText', () => {
  it('returns the same plain line as intro tokens (text + reference)', () => {
    const v: MemorizedVerse = {
      id: '1',
      reference: 'John 3:16',
      text: 'For God so loved the world',
      translation: 'niv',
      dateAdded: 0,
      lastPracticedAt: null,
      practiceSessions: [],
    }
    const s = getMemorizationListenUtteranceText(v)
    expect(s).toMatch(/For God so loved the world/i)
    expect(s).toMatch(/John 3:16/i)
  })
})
