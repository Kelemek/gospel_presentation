/**
 * @jest-environment jsdom
 */

import { PROFILE_BOOKMARKS_STORAGE_KEY } from '@/lib/profileBookmarksStorage'
import { GOSPEL_ANSWERS_KEY_PREFIX, VERSE_MEMORIZATION_STORAGE_KEY } from '@/lib/gospelClientStoragePolicy'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import * as gospelClientKvStore from '@/lib/gospelClientKvStore'
import {
  hydrateGospelClientStorage,
  gospelStorageGetSync,
  gospelStorageMutate,
  gospelStorageSet,
  gospelStorageSetSync,
  resetGospelClientStorageForTests,
} from '@/lib/gospelClientStorage'
import { hydrateMemorizedVersesStorage, loadMemorizedVerses } from '@/lib/verseMemorizationStorage'

describe('gospelClientStorage', () => {
  beforeEach(async () => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    const { idbRemoveItem } = await import('@/lib/gospelClientKvStore')
    try {
      await idbRemoveItem(VERSE_MEMORIZATION_STORAGE_KEY)
    } catch {
      /* first run */
    }
  })

  it('hydrate loads memorization list from localStorage into client storage', async () => {
    window.localStorage.setItem(
      VERSE_MEMORIZATION_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        verses: [
          {
            id: 'v1',
            reference: '1 Peter 2:13',
            text: 'Be subject',
            translation: 'esv',
            dateAdded: 1,
            lastPracticedAt: null,
            practiceSessions: [],
          },
        ],
      })
    )

    await hydrateGospelClientStorage()
    expect(loadMemorizedVerses()).toHaveLength(1)
    expect(loadMemorizedVerses()[0].reference).toBe('1 Peter 2:13')
    expect(gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)).toContain('1 Peter 2:13')
  })

  it('gospelStorageSetSync returns true for IndexedDB keys before async write completes', () => {
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}profile-a`
    jest.spyOn(gospelClientKvStore, 'idbSetItem').mockRejectedValue(new Error('idb failed'))

    expect(gospelStorageSetSync(key, '{"answers":[]}')).toBe(true)
    expect(gospelStorageGetSync(key)).toBe('{"answers":[]}')
  })

  it('gospelStorageSet returns false when IndexedDB and localStorage writes fail', async () => {
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}profile-b`
    jest.spyOn(gospelClientKvStore, 'idbSetItem').mockRejectedValue(new Error('idb failed'))
    const storage = installTestLocalStorage()
    jest.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota has been exceeded', 'QuotaExceededError')
    })

    await expect(gospelStorageSet(key, '{"answers":[]}')).resolves.toBe(false)
  })

  it('gospelStorageMutate serializes concurrent updates for the same key', async () => {
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}profile-concurrent`

    await Promise.all([
      gospelStorageMutate(key, (current) => {
        const rows: Array<{ questionId: string }> = current ? JSON.parse(current) : []
        rows.push({ questionId: 'q-a' })
        return JSON.stringify(rows)
      }),
      gospelStorageMutate(key, (current) => {
        const rows: Array<{ questionId: string }> = current ? JSON.parse(current) : []
        rows.push({ questionId: 'q-b' })
        return JSON.stringify(rows)
      }),
    ])

    const stored = gospelStorageGetSync(key)
    expect(stored).toBeTruthy()
    const ids = (JSON.parse(stored!) as Array<{ questionId: string }>).map((r) => r.questionId).sort()
    expect(ids).toEqual(['q-a', 'q-b'])
  })

  it('hydrate loads IndexedDB-only keys into sync read cache', async () => {
    const payload = JSON.stringify({
      v: 2,
      bookmarks: [
        {
          id: 'b1',
          slug: 'default',
          resourceTitle: 'Gospel',
          anchorId: 'section-1-0',
          locationLabel: '1',
          createdAt: 1,
        },
      ],
    })
    await gospelStorageSet(PROFILE_BOOKMARKS_STORAGE_KEY, payload)
    resetGospelClientStorageForTests()

    await hydrateGospelClientStorage()
    expect(gospelStorageGetSync(PROFILE_BOOKMARKS_STORAGE_KEY)).toBe(payload)
  })

  it('hydrateMemorizedVersesStorage is an alias for hydrateGospelClientStorage', async () => {
    const emptyPayload = JSON.stringify({ v: 1, verses: [] })
    window.localStorage.setItem(VERSE_MEMORIZATION_STORAGE_KEY, emptyPayload)
    await hydrateMemorizedVersesStorage()
    expect(gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)).toBe(emptyPayload)
  })
})
