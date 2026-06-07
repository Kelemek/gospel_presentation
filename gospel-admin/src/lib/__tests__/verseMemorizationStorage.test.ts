/**
 * @jest-environment jsdom
 */

import { idbRemoveItem, idbSetItem } from '@/lib/gospelClientKvStore'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import * as gospelClientStorage from '@/lib/gospelClientStorage'
import {
  gospelStorageGetSync,
  gospelStorageSetSync,
  resetGospelClientStorageForTests,
} from '@/lib/gospelClientStorage'
import {
  GOSPEL_MEMORIZATION_CHANGED_EVENT,
  VERSE_MEMORIZATION_STORAGE_KEY,
  addMemorizedVerse,
  tryAddMemorizedBibleBooks,
  tryAddMemorizedVerse,
  clearMemorizationInProgress,
  hydrateMemorizedVersesStorage,
  loadMemorizedVerses,
  removeMemorizedVerse,
  saveMemorizationInProgress,
  stripScriptureForMemorization,
  updatePracticeStats,
  getMasterLevel,
} from '@/lib/verseMemorizationStorage'

function countMemorizationChangedEvents(spy: jest.SpyInstance<typeof window.dispatchEvent>): number {
  return spy.mock.calls.filter(
    (args) =>
      args[0] instanceof CustomEvent && args[0].type === GOSPEL_MEMORIZATION_CHANGED_EVENT
  ).length
}

describe('verseMemorizationStorage', () => {
  beforeEach(async () => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    jest.restoreAllMocks()
    try {
      await idbRemoveItem(VERSE_MEMORIZATION_STORAGE_KEY)
    } catch {
      /* first run */
    }
  })

  it('addMemorizedVerse stores plain text and rejects duplicates', () => {
    expect(addMemorizedVerse('John 3:16', '<p>[16] For God</p>', 'esv')).toBe(true)
    expect(loadMemorizedVerses()).toHaveLength(1)
    expect(loadMemorizedVerses()[0].text).toBe('For God')
    expect(loadMemorizedVerses()[0].reference).toBe('John 3:16')
    expect(addMemorizedVerse('John 3:16', 'other', 'esv')).toBe(false)
  })

  it('hydrateMemorizedVersesStorage does not emit when memorization bytes are unchanged', async () => {
    const payload = JSON.stringify({
      v: 1,
      verses: [
        {
          id: 'v1',
          reference: 'John 3:16',
          text: 'For God',
          translation: 'esv',
          dateAdded: 1,
          lastPracticedAt: null,
          practiceSessions: [],
        },
      ],
    })
    window.localStorage.setItem(VERSE_MEMORIZATION_STORAGE_KEY, payload)
    gospelStorageSetSync(VERSE_MEMORIZATION_STORAGE_KEY, payload)

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    await hydrateMemorizedVersesStorage()
    expect(countMemorizationChangedEvents(dispatchSpy)).toBe(0)
    dispatchSpy.mockRestore()
  })

  it('hydrateMemorizedVersesStorage emits when IndexedDB-only data loads into memory', async () => {
    const payload = JSON.stringify({
      v: 1,
      verses: [
        {
          id: 'v1',
          reference: 'John 3:16',
          text: 'For God',
          translation: 'esv',
          dateAdded: 1,
          lastPracticedAt: null,
          practiceSessions: [],
        },
      ],
    })
    await idbSetItem(VERSE_MEMORIZATION_STORAGE_KEY, payload)
    resetGospelClientStorageForTests()

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    await hydrateMemorizedVersesStorage()
    expect(countMemorizationChangedEvents(dispatchSpy)).toBe(1)
    expect(loadMemorizedVerses()).toHaveLength(1)
    dispatchSpy.mockRestore()
  })

  it('persist notifies memorization listeners once per save', async () => {
    addMemorizedVerse('John 3:16', 'For God', 'esv')
    const id = loadMemorizedVerses()[0].id
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')

    removeMemorizedVerse(id)
    expect(countMemorizationChangedEvents(dispatchSpy)).toBe(1)

    await Promise.resolve()
    expect(countMemorizationChangedEvents(dispatchSpy)).toBe(1)
    dispatchSpy.mockRestore()
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
    expect(gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)).toContain('"v":1')
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
    const raw = gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)
    expect(raw).toContain('"practiceMode":"word"')
  })

  it('saveMemorizationInProgress persists practiceMode reorder', () => {
    addMemorizedVerse('Ps 23:1', 'The Lord is my shepherd', 'esv')
    const id = loadMemorizedVerses()[0].id
    saveMemorizationInProgress(id, {
      sessionSeed: 'seed-ro',
      wrongAttempts: 0,
      correctKeystrokes: 1,
      phase: { kind: 'inRound', roundIndex: 1 },
      practiceMode: 'reorder',
    })
    expect(loadMemorizedVerses()[0].inProgressPractice?.practiceMode).toBe('reorder')
    const raw = gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)
    expect(raw).toContain('"practiceMode":"reorder"')
  })

  it('saveMemorizationInProgress persists practiceMode firstLetters', () => {
    addMemorizedVerse('Ps 23:1', 'The Lord is my shepherd', 'esv')
    const id = loadMemorizedVerses()[0].id
    saveMemorizationInProgress(id, {
      sessionSeed: 'seed-fl',
      wrongAttempts: 0,
      correctKeystrokes: 1,
      phase: { kind: 'inRound', roundIndex: 2 },
      practiceMode: 'firstLetters',
    })
    expect(loadMemorizedVerses()[0].inProgressPractice?.practiceMode).toBe('firstLetters')
    const raw = gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)
    expect(raw).toContain('"practiceMode":"firstLetters"')
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

  it('tryAddMemorizedVerse fails when storage writes fail', async () => {
    jest.spyOn(gospelClientStorage, 'gospelStorageSet').mockResolvedValue(false)
    await expect(tryAddMemorizedVerse('1 Peter 2:13', 'Be subject', 'esv')).resolves.toEqual({
      ok: false,
      reason: 'storage_full',
    })
    expect(loadMemorizedVerses().some((v) => v.reference === '1 Peter 2:13')).toBe(false)
  })

  it('tryAddMemorizedVerse reports empty text after stripping markers', async () => {
    await expect(tryAddMemorizedVerse('1 Peter 2:13', '[13]', 'esv')).resolves.toEqual({
      ok: false,
      reason: 'empty_text',
    })
  })

  it('persist retries without in-progress practice when first write hits quota', async () => {
    addMemorizedVerse('John 3:16', 'For God', 'esv')
    const id = loadMemorizedVerses()[0].id
    saveMemorizationInProgress(id, {
      sessionSeed: 'seed',
      wrongAttempts: 0,
      correctKeystrokes: 0,
      phase: { kind: 'inRound', roundIndex: 1 },
    })
    expect(loadMemorizedVerses()[0].inProgressPractice).toBeDefined()

    jest.spyOn(gospelClientStorage, 'gospelStorageSet').mockImplementation(async (key, value) => {
      if (key === VERSE_MEMORIZATION_STORAGE_KEY && value.includes('inProgressPractice')) {
        return false
      }
      gospelStorageSetSync(key, value)
      return true
    })

    const result = await tryAddMemorizedVerse('1 Peter 2:13', 'Be subject', 'esv')
    expect(result).toEqual({ ok: true })
    const verses = loadMemorizedVerses()
    expect(verses.some((v) => v.reference === '1 Peter 2:13')).toBe(true)
    const john = verses.find((v) => v.reference === 'John 3:16')
    expect(john?.inProgressPractice).toBeUndefined()
  })

  it('tryAddMemorizedBibleBooks stores scoped bible books item', async () => {
    const result = await tryAddMemorizedBibleBooks('nt', 'esv')
    expect(result).toEqual({ ok: true })
    const items = loadMemorizedVerses()
    expect(items).toHaveLength(1)
    expect(items[0]?.kind).toBe('bibleBooks')
    expect(items[0]?.bibleBooksScope).toBe('nt')
    expect(items[0]?.reference).toBe('Bible Books (NT)')
    expect(items[0]?.text.length).toBeGreaterThan(0)
  })

  it('tryAddMemorizedBibleBooks allows different scopes', async () => {
    await expect(tryAddMemorizedBibleBooks('ot', 'esv')).resolves.toEqual({ ok: true })
    await expect(tryAddMemorizedBibleBooks('nt', 'esv')).resolves.toEqual({ ok: true })
    expect(loadMemorizedVerses()).toHaveLength(2)
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
