/**
 * @jest-environment jsdom
 */

import { gospelStorageGetSync, resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import * as gospelClientStorage from '@/lib/gospelClientStorage'
import { PROFILE_CACHE_INDEX_KEY, profileOfflineCacheKey } from '@/lib/gospelClientStoragePolicy'
import {
  getProfileOfflineCache,
  MAX_PROFILE_OFFLINE_CACHE_ENTRIES,
  setProfileOfflineCache,
} from '@/lib/profileOfflineCache'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

describe('profileOfflineCache', () => {
  beforeEach(() => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
  })

  it('setProfileOfflineCache performs one durable write per key', async () => {
    const setSpy = jest.spyOn(gospelClientStorage, 'gospelStorageSet').mockResolvedValue(true)

    await setProfileOfflineCache('alpha', '{"profile":{"slug":"alpha"}}')

    const profileWrites = setSpy.mock.calls.filter(([k]) => k === profileOfflineCacheKey('alpha'))
    const indexWrites = setSpy.mock.calls.filter(([k]) => k === PROFILE_CACHE_INDEX_KEY)
    expect(profileWrites).toHaveLength(1)
    expect(indexWrites).toHaveLength(1)

    setSpy.mockRestore()
  })

  it('does not update index when profile write fails', async () => {
    const setSpy = jest
      .spyOn(gospelClientStorage, 'gospelStorageSet')
      .mockImplementation(async (key) => key !== profileOfflineCacheKey('beta'))

    await setProfileOfflineCache('beta', '{"profile":{"slug":"beta"}}')

    expect(gospelStorageGetSync(PROFILE_CACHE_INDEX_KEY)).toBeNull()
    expect(getProfileOfflineCache('beta')).toBeNull()

    setSpy.mockRestore()
  })

  it('accumulates slugs in the LRU index across writes', async () => {
    await setProfileOfflineCache('a', '{"n":1}')
    await setProfileOfflineCache('b', '{"n":2}')

    const indexRaw = gospelStorageGetSync(PROFILE_CACHE_INDEX_KEY)
    expect(indexRaw).toContain('"slug":"a"')
    expect(indexRaw).toContain('"slug":"b"')
  })

  it('evicts oldest slugs when over LRU limit', async () => {
    let tick = 1_000_000
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => {
      tick += 1
      return tick
    })
    for (let i = 0; i < MAX_PROFILE_OFFLINE_CACHE_ENTRIES + 1; i += 1) {
      await setProfileOfflineCache(`slug-${i}`, `{"n":${i}}`)
    }

    nowSpy.mockRestore()

    const indexRaw = gospelStorageGetSync(PROFILE_CACHE_INDEX_KEY)
    expect(indexRaw).toBeTruthy()
    const slugs = (JSON.parse(indexRaw!) as { entries: Array<{ slug: string }> }).entries.map(
      (e) => e.slug
    )
    expect(slugs).toHaveLength(MAX_PROFILE_OFFLINE_CACHE_ENTRIES)
    expect(slugs).not.toContain('slug-0')
    expect(slugs).toContain(`slug-${MAX_PROFILE_OFFLINE_CACHE_ENTRIES}`)
    expect(getProfileOfflineCache('slug-0')).toBeNull()
  })
})
