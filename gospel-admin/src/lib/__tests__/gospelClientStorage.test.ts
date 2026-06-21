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
  gospelStorageRemove,
  gospelStorageRemoveSync,
  gospelStorageSet,
  gospelStorageSetSync,
  resetGospelClientStorageForTests,
} from '@/lib/gospelClientStorage'
import { hydrateMemorizedVersesStorage, loadMemorizedVerses } from '@/lib/verseMemorizationStorage'
import * as gospelDeviceSyncDirty from '@/lib/gospelDeviceSync/dirty'

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

  it('gospelStorageSetSync marks sync dirty immediately for IndexedDB keys', () => {
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}defer-dirty`
    const markSpy = jest.spyOn(gospelDeviceSyncDirty, 'markSyncKeyDirty')
    let resolveIdb!: () => void
    const idbPromise = new Promise<void>((resolve) => {
      resolveIdb = resolve
    })
    jest.spyOn(gospelClientKvStore, 'idbSetItem').mockReturnValue(idbPromise)

    gospelStorageSetSync(key, '{"answers":[]}')
    expect(markSpy).toHaveBeenCalledWith(key)

    resolveIdb()
  })

  it('gospelStorageSetSync marks sync dirty after localStorage fallback when IndexedDB fails', async () => {
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}fallback-dirty`
    const markSpy = jest.spyOn(gospelDeviceSyncDirty, 'markSyncKeyDirty')
    const idbSpy = jest
      .spyOn(gospelClientKvStore, 'idbSetItem')
      .mockRejectedValue(new Error('idb failed'))

    gospelStorageSetSync(key, '{"answers":[]}')
    await idbSpy.mock.results[0]?.value?.catch(() => {})

    expect(markSpy).toHaveBeenCalledWith(key)
  })

  it('gospelStorageSetSync marks profile reading resume sync dirty', () => {
    gospelDeviceSyncDirty.enableDeviceSyncLocal('dGVzdC1zeW5jLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MDE=')
    const markSpy = jest.spyOn(gospelDeviceSyncDirty, 'markSyncKeyDirty')
    gospelStorageSetSync(
      'gospel-profile-reading-resume:default',
      '{"v":1,"anchorId":"section-1-0","plainOffset":0,"fingerprint":"fp"}'
    )
    expect(markSpy).toHaveBeenCalledWith('gospel-profile-reading-resume:default')
    expect(gospelDeviceSyncDirty.getDirtyKeys()).toContain('gospel-profile-reading-resume:default')
    gospelDeviceSyncDirty.disableDeviceSyncLocal()
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

  it('gospelStorageSet marks sync dirty for localStorage-only keys', async () => {
    gospelDeviceSyncDirty.enableDeviceSyncLocal('dGVzdC1zeW5jLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MDE=')
    const markSpy = jest.spyOn(gospelDeviceSyncDirty, 'markSyncKeyDirty')
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')

    await expect(gospelStorageSet('gospel-profile-theme', 'dark')).resolves.toBe(true)
    expect(markSpy).toHaveBeenCalledWith('gospel-profile-theme')
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'gospel-sync-dirty' }))

    gospelDeviceSyncDirty.disableDeviceSyncLocal()
  })

  it('gospelStorageRemove marks sync dirty for removed syncable keys', async () => {
    const markSpy = jest.spyOn(gospelDeviceSyncDirty, 'markSyncKeyDirty')
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}remove-dirty`
    await gospelStorageSet(key, '[]')
    markSpy.mockClear()

    await gospelStorageRemove(key)
    expect(markSpy).toHaveBeenCalledWith(key)
    expect(gospelStorageGetSync(key)).toBeNull()
  })

  it('gospelStorageRemoveSync marks sync dirty for removed syncable keys', () => {
    const markSpy = jest.spyOn(gospelDeviceSyncDirty, 'markSyncKeyDirty')
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}remove-sync-dirty`
    gospelStorageSetSync(key, '[]')
    markSpy.mockClear()

    gospelStorageRemoveSync(key)
    expect(markSpy).toHaveBeenCalledWith(key)
    expect(gospelStorageGetSync(key)).toBeNull()
  })

  it('gospelStorageSet emits gospel-client-storage-changed', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    await expect(gospelStorageSet('gospel-profile-theme', 'dark')).resolves.toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'gospel-client-storage-changed',
        detail: { key: 'gospel-profile-theme' },
      })
    )
  })

  it('gospelStorageRemove does not dispatch gospel-sync-dirty while sync dirty is suppressed', async () => {
    const key = `${GOSPEL_ANSWERS_KEY_PREFIX}pull-remove`
    await gospelStorageSet(key, '[]')
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    dispatchSpy.mockClear()

    await gospelDeviceSyncDirty.withSyncDirtySuppressed(async () => {
      await gospelStorageRemove(key)
    })

    const dirtyEvents = dispatchSpy.mock.calls.filter(
      (call) => call[0] instanceof CustomEvent && call[0].type === 'gospel-sync-dirty'
    )
    expect(dirtyEvents).toHaveLength(0)
    expect(gospelStorageGetSync(key)).toBeNull()
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
