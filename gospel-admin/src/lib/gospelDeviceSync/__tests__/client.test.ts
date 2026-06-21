/**
 * @jest-environment jsdom
 */

import { webcrypto } from 'node:crypto'
import { TextDecoder, TextEncoder } from 'node:util'
import { GOSPEL_ANSWERS_KEY_PREFIX } from '@/lib/gospelClientStoragePolicy'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { profileReadingResumeStorageKey, saveProfileReadingResume } from '@/lib/profileReadingResumeStorage'
import * as dirty from '@/lib/gospelDeviceSync/dirty'
import { pushDirtyKeys } from '@/lib/gospelDeviceSync/client'

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: TextEncoder,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: TextDecoder,
    configurable: true,
  })
})

describe('gospelDeviceSync client pushDirtyKeys', () => {
  const syncKey = 'dGVzdC1zeW5jLWtleS0xMjM0NTY3ODkwMTIzNDU2Nzg5MDE='
  const storageId = 'a'.repeat(64)

  beforeEach(() => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
    dirty.enableDeviceSyncLocal(syncKey)
    dirty.clearDirtyKeys(dirty.getDirtyKeys())
    jest.restoreAllMocks()
  })

  it('pushes tombstones for dirty keys removed from local storage', async () => {
    const deletedKey = `${GOSPEL_ANSWERS_KEY_PREFIX}deleted-profile`
    dirty.markSyncKeyDirty(deletedKey)

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock)

    await pushDirtyKeys(syncKey, storageId)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as {
      entries: Array<{ key: string; deleted?: boolean }>
    }
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0]).toMatchObject({ key: deletedKey, deleted: true })
    expect(dirty.getDirtyKeys()).toEqual([])
  })

  it('pushes dirty profile reading resume keys from memory cache', async () => {
    const slug = 'default'
    const key = profileReadingResumeStorageKey(slug)
    saveProfileReadingResume(slug, 'section-2-0', 120, 'fp-test')
    dirty.markSyncKeyDirty(key)

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    jest.spyOn(global, 'fetch').mockImplementation(fetchMock)

    await pushDirtyKeys(syncKey, storageId)

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body)) as {
      entries: Array<{ key: string; ciphertext: string; deleted?: boolean }>
    }
    expect(body.entries).toHaveLength(1)
    expect(body.entries[0]?.key).toBe(key)
    expect(body.entries[0]?.deleted).toBeUndefined()
    expect(body.entries[0]?.ciphertext).toBeTruthy()
  })
})
