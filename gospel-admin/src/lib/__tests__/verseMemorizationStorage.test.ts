/**
 * @jest-environment jsdom
 */

import {
  VERSE_MEMORIZATION_STORAGE_KEY,
  addMemorizedVerse,
  loadMemorizedVerses,
  removeMemorizedVerse,
  stripScriptureForMemorization,
  updatePracticeStats,
  getMasterLevel,
} from '@/lib/verseMemorizationStorage'

describe('verseMemorizationStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('addMemorizedVerse stores plain text and rejects duplicates', () => {
    expect(addMemorizedVerse('John 3:16', '<p>[16] For God</p>', 'esv')).toBe(true)
    expect(loadMemorizedVerses()).toHaveLength(1)
    expect(loadMemorizedVerses()[0].text).toBe('For God')
    expect(loadMemorizedVerses()[0].reference).toBe('John 3:16')
    expect(addMemorizedVerse('John 3:16', 'other', 'esv')).toBe(false)
  })

  it('removeMemorizedVerse removes by id', () => {
    addMemorizedVerse('Rom 8:28', 'And we know', 'esv')
    const id = loadMemorizedVerses()[0].id
    removeMemorizedVerse(id)
    expect(loadMemorizedVerses()).toHaveLength(0)
  })

  it('stripScriptureForMemorization strips markers and tags', () => {
    expect(stripScriptureForMemorization('[1] Hello <b>world</b>')).toBe('Hello world')
  })

  it('updatePracticeStats appends session', () => {
    addMemorizedVerse('Ps 23:1', 'The Lord is my shepherd', 'esv')
    const id = loadMemorizedVerses()[0].id
    const updated = updatePracticeStats(id, {
      wrongAttempts: 2,
      correctKeystrokes: 10,
      completed: true,
    })
    expect(updated?.practiceSessions).toHaveLength(1)
    expect(updated?.practiceSessions[0].wrongAttempts).toBe(2)
    expect(updated?.lastPracticedAt).not.toBeNull()
  })

  it('getMasterLevel follows completed session counts', () => {
    const base = {
      id: 'x',
      reference: 'Jhn 1:1',
      text: 'In the beginning',
      translation: 'esv' as const,
      dateAdded: 0,
      lastPracticedAt: null,
      practiceSessions: [],
    }
    expect(getMasterLevel(base)).toBe('learning')
    const practicing = {
      ...base,
      practiceSessions: Array.from({ length: 3 }, () => ({
        date: 1,
        wrongAttempts: 0,
        correctKeystrokes: 5,
        completed: true,
      })),
    }
    expect(getMasterLevel(practicing)).toBe('practicing')
    const mastered = {
      ...base,
      practiceSessions: Array.from({ length: 9 }, () => ({
        date: 1,
        wrongAttempts: 0,
        correctKeystrokes: 5,
        completed: true,
      })),
    }
    expect(getMasterLevel(mastered)).toBe('mastered')
  })

  it('persists under expected storage key', () => {
    addMemorizedVerse('Gen 1:1', 'In the beginning', 'esv')
    expect(window.localStorage.getItem(VERSE_MEMORIZATION_STORAGE_KEY)).toContain('"v":1')
  })
})
