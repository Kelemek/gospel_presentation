/**
 * @jest-environment jsdom
 */

import {
  VERSE_MEMORIZATION_STORAGE_KEY,
  addMemorizedVerse,
  clearMemorizationInProgress,
  loadMemorizedVerses,
  removeMemorizedVerse,
  saveMemorizationInProgress,
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

  it('saveMemorizationInProgress stores resume payload and clearMemorizationInProgress removes it', () => {
    addMemorizedVerse('Ps 23:1', 'The Lord is my shepherd', 'esv')
    const id = loadMemorizedVerses()[0].id
    saveMemorizationInProgress(id, {
      sessionSeed: 'seed-1',
      wrongAttempts: 1,
      correctKeystrokes: 5,
      phase: { kind: 'betweenRounds', completedRoundIndex: 2 },
    })
    const mid = loadMemorizedVerses()[0]
    expect(mid.inProgressPractice?.phase).toEqual({ kind: 'betweenRounds', completedRoundIndex: 2 })
    expect(mid.inProgressPractice?.sessionSeed).toBe('seed-1')
    expect(mid.inProgressPractice?.practiceMode).toBeUndefined()
    clearMemorizationInProgress(id)
    expect(loadMemorizedVerses()[0].inProgressPractice).toBeUndefined()
  })

  it('saveMemorizationInProgress persists practiceMode word', () => {
    addMemorizedVerse('Ps 23:1', 'The Lord is my shepherd', 'esv')
    const id = loadMemorizedVerses()[0].id
    saveMemorizationInProgress(id, {
      sessionSeed: 'seed-w',
      wrongAttempts: 0,
      correctKeystrokes: 2,
      phase: { kind: 'inRound', roundIndex: 2 },
      practiceMode: 'word',
    })
    expect(loadMemorizedVerses()[0].inProgressPractice?.practiceMode).toBe('word')
    const raw = window.localStorage.getItem(VERSE_MEMORIZATION_STORAGE_KEY)
    expect(raw).toContain('"practiceMode":"word"')
  })

  it('updatePracticeStats clears inProgressPractice when a session completes', () => {
    addMemorizedVerse('Ps 119:1', 'Blessed are they', 'esv')
    const id = loadMemorizedVerses()[0].id
    saveMemorizationInProgress(id, {
      sessionSeed: 's',
      wrongAttempts: 0,
      correctKeystrokes: 1,
      phase: { kind: 'inRound', roundIndex: 3 },
    })
    expect(loadMemorizedVerses()[0].inProgressPractice).toBeDefined()
    updatePracticeStats(id, { wrongAttempts: 0, correctKeystrokes: 10, completed: true })
    const after = loadMemorizedVerses()[0]
    expect(after.inProgressPractice).toBeUndefined()
    expect(after.practiceSessions).toHaveLength(1)
  })

  it('getMasterLevel ignores in-progress only (completed sessions only)', () => {
    addMemorizedVerse('Prov 1:1', 'The proverbs', 'esv')
    const id = loadMemorizedVerses()[0].id
    saveMemorizationInProgress(id, {
      sessionSeed: 's',
      wrongAttempts: 0,
      correctKeystrokes: 0,
      phase: { kind: 'inRound', roundIndex: 1 },
    })
    expect(getMasterLevel(loadMemorizedVerses()[0])).toBe('learning')
  })
})
