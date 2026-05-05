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
      'gospel-preferred-translation': 'esv',
    })
    const map = collectGospelLocalUserDataForExport(s)
    expect(map[PROFILE_BOOKMARKS_STORAGE_KEY]).toBeDefined()
    expect(map[PROFILE_HIGHLIGHTS_STORAGE_KEY]).toBeDefined()
    expect(map[VERSE_MEMORIZATION_STORAGE_KEY]).toBeDefined()
    expect(map['gospel-verse-pins-myprofile']).toBeDefined()
    expect(map['gospel-answers-myprofile']).toBeDefined()
    expect(map['gospel-preferred-translation']).toBe('esv')
  })

  it('collectGospelLocalUserDataForExport excludes auth, view preference, and profile cache keys', () => {
    const s = createMemoryStorage({
      'gospel-admin-auth': '{"token":"x"}',
      'gospel-view-preference': 'card',
      'gospel-profile-my-slug': '{"profile":{"slug":"my-slug"}}',
      [PROFILE_BOOKMARKS_STORAGE_KEY]: '{"v":1,"bookmarks":[]}',
    })
    const map = collectGospelLocalUserDataForExport(s)
    expect(map['gospel-admin-auth']).toBeUndefined()
    expect(map['gospel-view-preference']).toBeUndefined()
    expect(map['gospel-profile-my-slug']).toBeUndefined()
    expect(map[PROFILE_BOOKMARKS_STORAGE_KEY]).toBeDefined()
  })

  it('buildGospelLocalUserDataPayload sets kind, schemaVersion, and localStorage map', () => {
    const s = createMemoryStorage({
      [VERSE_MEMORIZATION_STORAGE_KEY]: '{"v":1,"verses":[]}',
    })
    const p = buildGospelLocalUserDataPayload(s)
    expect(p.kind).toBe(GOSPEL_LOCAL_USER_DATA_KIND)
    expect(p.schemaVersion).toBe(GOSPEL_LOCAL_USER_DATA_SCHEMA_VERSION)
    expect(p.localStorage[VERSE_MEMORIZATION_STORAGE_KEY]).toBe('{"v":1,"verses":[]}')
    expect(typeof p.exportedAt).toBe('string')
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

  it('applyGospelLocalUserDataImport round-trips into storage', () => {
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
    applyGospelLocalUserDataImport(payload, target)
    expect(target.getItem('gospel-preferred-translation')).toBe('kjv')
  })
})
