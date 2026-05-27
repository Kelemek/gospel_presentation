/**
 * @jest-environment jsdom
 */

import {
  gospelStorageGetSync,
  gospelStorageSet,
  hydrateGospelClientStorage,
  resetGospelClientStorageForTests,
} from '@/lib/gospelClientStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'
import {
  GOSPEL_LOCAL_USER_DATA_KIND,
  GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
  applyGospelLocalUserDataImport,
  buildGospelLocalUserDataPayload,
  collectGospelLocalUserDataForExport,
  gospelLocalBackupFilename,
  parseGospelLocalUserDataImport,
} from '@/lib/gospelLocalUserDataBackup'
import { PROFILE_BOOKMARKS_STORAGE_KEY } from '@/lib/profileBookmarksStorage'
import { PROFILE_HIGHLIGHTS_STORAGE_KEY } from '@/lib/profileHighlightsStorage'
import { PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY } from '@/lib/profileReadAlongUnderlineStyleStorage'
import { PRESENTATION_READ_COMPLETE_STORAGE_KEY } from '@/lib/presentationReadCompleteStorage'
import { VERSE_MEMORIZATION_STORAGE_KEY } from '@/lib/verseMemorizationStorage'

function createMemoryStorage(initial: Record<string, string | null> = {}): Storage {
  const data: Record<string, string> = {}
  for (const [k, v] of Object.entries(initial)) {
    if (v != null) data[k] = v
  }
  return {
    get length() {
      return Object.keys(data).length
    },
    clear() {
      Object.keys(data).forEach((k) => {
        delete data[k]
      })
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    key(index: number) {
      const keys = Object.keys(data)
      return keys[index] ?? null
    },
    removeItem(key: string) {
      delete data[key]
    },
    setItem(key: string, value: string) {
      data[key] = value
    },
  } as Storage
}

describe('gospelLocalUserDataBackup', () => {
  beforeEach(() => {
    resetGospelClientStorageForTests()
    installTestLocalStorage()
  })

  it('gospelLocalBackupFilename uses .txt on native Android only', () => {
    expect(gospelLocalBackupFilename('20260101', 'android', true)).toBe('gospel-local-backup-20260101.txt')
    expect(gospelLocalBackupFilename('20260101', 'android', false)).toBe('gospel-local-backup-20260101.json')
    expect(gospelLocalBackupFilename('20260101', 'ios', true)).toBe('gospel-local-backup-20260101.json')
    expect(gospelLocalBackupFilename('20260101', 'web', false)).toBe('gospel-local-backup-20260101.json')
  })

  it('collectGospelLocalUserDataForExport includes curated keys and prefix keys', () => {
    const s = createMemoryStorage({
      [PROFILE_BOOKMARKS_STORAGE_KEY]: '{"v":1,"bookmarks":[]}',
      [PROFILE_HIGHLIGHTS_STORAGE_KEY]: '{"v":1,"highlights":[]}',
      [VERSE_MEMORIZATION_STORAGE_KEY]: '{"v":1,"verses":[]}',
      'gospel-verse-pins-myprofile': '{"v":2,"yellow":null,"bookmarks":[]}',
      'gospel-answers-myprofile': '{}',
      'gospel-mcheyne-start:v1:mchy': '2026-01-01',
      'gospel-preferred-translation': 'esv',
      'gospel-profile-read-along:slug:section-1': '{"v":1,"plainOffset":0,"fingerprint":"x"}',
      'gospel-profile-read-along-last:slug': '{"v":1,"anchorId":"section-1","plainOffset":0,"fingerprint":"x"}',
      [PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY]: 'line',
      [PRESENTATION_READ_COMPLETE_STORAGE_KEY]: '{"v":1,"slugs":["done-slug"]}',
    })
    const map = collectGospelLocalUserDataForExport(s)
    expect(map[PROFILE_BOOKMARKS_STORAGE_KEY]).toBeDefined()
    expect(map[PROFILE_HIGHLIGHTS_STORAGE_KEY]).toBeDefined()
    expect(map[VERSE_MEMORIZATION_STORAGE_KEY]).toBeDefined()
    expect(map['gospel-verse-pins-myprofile']).toBeDefined()
    expect(map['gospel-answers-myprofile']).toBeDefined()
    expect(map['gospel-mcheyne-start:v1:mchy']).toBe('2026-01-01')
    expect(map['gospel-preferred-translation']).toBe('esv')
    expect(map['gospel-profile-read-along:slug:section-1']).toBe('{"v":1,"plainOffset":0,"fingerprint":"x"}')
    expect(map['gospel-profile-read-along-last:slug']).toBe('{"v":1,"anchorId":"section-1","plainOffset":0,"fingerprint":"x"}')
    expect(map[PROFILE_READ_ALONG_UNDERLINE_STYLE_STORAGE_KEY]).toBe('line')
    expect(map[PRESENTATION_READ_COMPLETE_STORAGE_KEY]).toBe('{"v":1,"slugs":["done-slug"]}')
  })

  it('collectGospelLocalUserDataForExport excludes auth, view preference, and profile cache keys', () => {
    const s = createMemoryStorage({
      'gospel-admin-auth': '{"token":"x"}',
      'gospel-view-preference': 'card',
      'gospel-profile-my-slug': '{"profile":{"slug":"my-slug"}}',
      'gospel-profile-read-along:my-slug:section-1': '{"v":1,"plainOffset":3,"fingerprint":"fp"}',
      [PROFILE_BOOKMARKS_STORAGE_KEY]: '{"v":1,"bookmarks":[]}',
    })
    const map = collectGospelLocalUserDataForExport(s)
    expect(map['gospel-admin-auth']).toBeUndefined()
    expect(map['gospel-view-preference']).toBeUndefined()
    expect(map['gospel-profile-my-slug']).toBeUndefined()
    expect(map['gospel-profile-read-along:my-slug:section-1']).toBe('{"v":1,"plainOffset":3,"fingerprint":"fp"}')
    expect(map[PROFILE_BOOKMARKS_STORAGE_KEY]).toBeDefined()
  })

  it('buildGospelLocalUserDataPayload sets kind, schemaVersion, and localStorage map', async () => {
    const s = createMemoryStorage({
      [VERSE_MEMORIZATION_STORAGE_KEY]: '{"v":1,"verses":[]}',
    })
    const p = await buildGospelLocalUserDataPayload(s)
    expect(p.kind).toBe(GOSPEL_LOCAL_USER_DATA_KIND)
    expect(p.schemaVersion).toBe(GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION)
    expect(p.localStorage[VERSE_MEMORIZATION_STORAGE_KEY]).toBe('{"v":1,"verses":[]}')
    expect(typeof p.exportedAt).toBe('string')
  })

  it('buildGospelLocalUserDataPayload includes IndexedDB-only prefix keys after migration', async () => {
    const s = createMemoryStorage()
    const pinsKey = 'gospel-verse-pins-profile-a'
    const answersKey = 'gospel-answers-profile-a'
    const readAlongKey = 'gospel-profile-read-along:profile-a:section-1-0'

    await gospelStorageSet(pinsKey, '{"v":2,"yellow":null,"bookmarks":[{"id":"b1"}]}')
    await gospelStorageSet(answersKey, '{"saved":[{"id":"q1","answer":"hi"}]}')
    await gospelStorageSet(readAlongKey, '{"v":1,"plainOffset":4,"fingerprint":"fp"}')
    await hydrateGospelClientStorage()

    expect(s.getItem(pinsKey)).toBeNull()
    expect(s.getItem(answersKey)).toBeNull()

    const p = await buildGospelLocalUserDataPayload(s)
    expect(p.localStorage[pinsKey]).toContain('"b1"')
    expect(p.localStorage[answersKey]).toContain('hi')
    expect(p.localStorage[readAlongKey]).toContain('"plainOffset":4')
  })

  it('parseGospelLocalUserDataImport accepts valid payload', () => {
    const json = JSON.stringify({
      kind: GOSPEL_LOCAL_USER_DATA_KIND,
      schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
      exportedAt: '2026-01-01T00:00:00.000Z',
      origin: 'https://example.com',
      localStorage: {
        [VERSE_MEMORIZATION_STORAGE_KEY]: '{"v":1,"verses":[]}',
      },
    })
    const p = parseGospelLocalUserDataImport(json)
    expect(p.localStorage[VERSE_MEMORIZATION_STORAGE_KEY]).toBe('{"v":1,"verses":[]}')
  })

  it('parseGospelLocalUserDataImport rejects bad JSON', () => {
    expect(() => parseGospelLocalUserDataImport('not json')).toThrow(/could not read as json/i)
  })

  it('parseGospelLocalUserDataImport rejects wrong kind', () => {
    expect(() =>
      parseGospelLocalUserDataImport(
        JSON.stringify({
          kind: 'other',
          schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
          localStorage: {},
        })
      )
    ).toThrow(/wrong type/i)
  })

  it('parseGospelLocalUserDataImport rejects unknown top-level fields', () => {
    expect(() =>
      parseGospelLocalUserDataImport(
        JSON.stringify({
          kind: GOSPEL_LOCAL_USER_DATA_KIND,
          schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
          localStorage: {},
          extra: 1,
        })
      )
    ).toThrow(/unexpected fields/i)
  })

  it('parseGospelLocalUserDataImport rejects unsafe keys in localStorage map', () => {
    expect(() =>
      parseGospelLocalUserDataImport(
        JSON.stringify({
          kind: GOSPEL_LOCAL_USER_DATA_KIND,
          schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
          localStorage: {
            'gospel-admin-auth': 'x',
          },
        })
      )
    ).toThrow(/cannot be restored safely/i)
  })

  it('applyGospelLocalUserDataImport restores read-along persistence keys', async () => {
    const target = createMemoryStorage()
    const payload = parseGospelLocalUserDataImport(
      JSON.stringify({
        kind: GOSPEL_LOCAL_USER_DATA_KIND,
        schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
        exportedAt: '2026-01-01T00:00:00.000Z',
        origin: '',
        localStorage: {
          'gospel-profile-read-along:slug:section-1': '{"v":1,"plainOffset":10,"fingerprint":"fp"}',
          'gospel-profile-read-along-last:slug': '{"v":1,"anchorId":"section-1","plainOffset":10,"fingerprint":"fp"}',
        },
      })
    )
    await applyGospelLocalUserDataImport(payload, target)
    expect(gospelStorageGetSync('gospel-profile-read-along:slug:section-1')).toContain('10')
    expect(gospelStorageGetSync('gospel-profile-read-along-last:slug')).toContain('section-1')
  })

  it('applyGospelLocalUserDataImport round-trips into storage', async () => {
    const target = createMemoryStorage()
    const payload = parseGospelLocalUserDataImport(
      JSON.stringify({
        kind: GOSPEL_LOCAL_USER_DATA_KIND,
        schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
        exportedAt: '2026-01-01T00:00:00.000Z',
        origin: '',
        localStorage: {
          'gospel-preferred-translation': 'kjv',
        },
      })
    )
    await applyGospelLocalUserDataImport(payload, target)
    expect(target.getItem('gospel-preferred-translation')).toBe('kjv')
  })

  it('applyGospelLocalUserDataImport restores presentation read-complete key', async () => {
    const target = createMemoryStorage()
    const readPayload = '{"v":1,"slugs":["sermon-a"]}'
    const payload = parseGospelLocalUserDataImport(
      JSON.stringify({
        kind: GOSPEL_LOCAL_USER_DATA_KIND,
        schemaVersion: GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION,
        exportedAt: '2026-01-01T00:00:00.000Z',
        origin: '',
        localStorage: {
          [PRESENTATION_READ_COMPLETE_STORAGE_KEY]: readPayload,
        },
      })
    )
    await applyGospelLocalUserDataImport(payload, target)
    expect(gospelStorageGetSync(PRESENTATION_READ_COMPLETE_STORAGE_KEY)).toBe(readPayload)
  })
})
