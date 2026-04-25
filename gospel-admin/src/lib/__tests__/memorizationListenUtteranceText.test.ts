import {
  getMemorizationListenUtteranceText,
  referenceToSpeechText,
} from '@/lib/memorizationListenUtteranceText'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

describe('referenceToSpeechText', () => {
  it('turns chapter:verse into words so TTS does not read a clock time', () => {
    expect(referenceToSpeechText('John 3:16')).toBe('John chapter 3, verse 16')
  })

  it('handles verse ranges and en dash', () => {
    expect(referenceToSpeechText('1 Peter 1:3-5')).toBe('1 Peter chapter 1, verses 3 through 5')
    expect(referenceToSpeechText('Gen 1:1–3')).toBe('Gen chapter 1, verses 1 through 3')
  })

  it('falls back to chapter/verse when there is no book name', () => {
    expect(referenceToSpeechText('3:16')).toBe('chapter 3, verse 16')
  })
})

describe('getMemorizationListenUtteranceText', () => {
  it('returns verse text plus TTS-friendly reference (not the on-screen "3:16" form)', () => {
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
    expect(s).toBe('For God so loved the world John chapter 3, verse 16')
  })
})
