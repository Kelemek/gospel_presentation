/**
 * @jest-environment jsdom
 */

import {
  assignVersePin,
  assignYellowLastViewed,
  availablePinColorsForModalChoice,
  anchoredPinMatchesDisplayRow,
  clearVersePinsMatchingRow,
  createEmptyVersePinsState,
  legacyScriptureProgressStorageKey,
  loadVersePins,
  parseLegacyScriptureProgress,
  pinnedVerseMatchesRow,
  removeVersePin,
  removeVersePinByColor,
  shouldAdvanceYellowLastViewed,
  versePinStorageKey,
  versePinsListFromState,
} from '@/lib/versePinStorage'

describe('versePinStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('storage key prefixes slug', () => {
    expect(versePinStorageKey('my-profile')).toBe('gospel-verse-pins-my-profile')
  })

  test('anchoredPinMatchesDisplayRow: modal-view matches any row with same reference', () => {
    const pin = { reference: 'John 3:16', sectionId: 'modal-view', subsectionId: 'modal-view' }
    expect(
      anchoredPinMatchesDisplayRow(pin, 'John 3:16', 's1', 'ss1')
    ).toBe(true)
    expect(anchoredPinMatchesDisplayRow(pin, 'Romans 8:1', 's1', 'ss1')).toBe(false)
  })

  test('anchoredPinMatchesDisplayRow: exact anchors require match', () => {
    const pin = { reference: 'John 3:16', sectionId: 's1', subsectionId: 'ss1' }
    expect(
      anchoredPinMatchesDisplayRow(pin, 'John 3:16', 's1', 'ss1')
    ).toBe(true)
    expect(
      anchoredPinMatchesDisplayRow(pin, 'John 3:16', 's2', 'ss1')
    ).toBe(false)
  })

  test('pinnedVerseMatchesRow: mutual row equality', () => {
    const a = { reference: 'Jn 3:16', sectionId: 'modal-view', subsectionId: 'modal-view' }
    const b = { reference: 'Jn 3:16', sectionId: 'x', subsectionId: 'y' }
    expect(pinnedVerseMatchesRow(a, b)).toBe(true)

    expect(
      pinnedVerseMatchesRow(
        { reference: 'Jn 3:16', sectionId: 's1', subsectionId: 'ss1' },
        { reference: 'Jn 3:16', sectionId: 's1', subsectionId: 'ss1' }
      )
    ).toBe(true)
    expect(
      pinnedVerseMatchesRow(
        { reference: 'Jn 3:16', sectionId: 's1', subsectionId: 'ss1' },
        { reference: 'Jn 3:16', sectionId: 's2', subsectionId: 'ss1' }
      )
    ).toBe(false)
  })

  test('assignVersePin adds bookmark and persists v2', () => {
    const slug = 'p1'
    const state = assignVersePin(slug, 'red', {
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 'ss1',
    })
    expect(state.bookmarks).toHaveLength(1)
    expect(state.bookmarks[0]?.colorId).toBe('red')

    const re = loadVersePins(slug)
    expect(re.bookmarks.some((b) => b.reference === 'John 3:16')).toBe(true)
    expect(JSON.parse(localStorage.getItem(versePinStorageKey(slug))!).v).toBe(2)
  })

  test('assignYellowLastViewed does not set yellow when a bookmark pins that row', () => {
    const slug = 'pz'
    assignVersePin(slug, 'red', {
      reference: 'Jn 3:16',
      sectionId: 's1',
      subsectionId: 'ss1',
    })
    const row = {
      reference: 'Jn 3:16',
      sectionId: 's1',
      subsectionId: 'ss1',
    }
    assignYellowLastViewed(slug, row)
    const m = loadVersePins(slug)
    expect(m.bookmarks.some((b) => b.colorId === 'red')).toBe(true)
    expect(m.yellow).toBeNull()
  })

  test('assignYellowLastViewed advances yellow when no bookmark on that row', () => {
    const slug = 'py'
    const row = { reference: 'Ps 23:1', sectionId: 's1', subsectionId: 'a' }
    assignYellowLastViewed(slug, row)
    const m = loadVersePins(slug)
    expect(m.yellow?.reference).toBe('Ps 23:1')
  })

  test('shouldAdvanceYellowLastViewed matches assignYellow behavior', () => {
    let s = createEmptyVersePinsState()
    expect(shouldAdvanceYellowLastViewed(s, { reference: 'A', sectionId: '1', subsectionId: '2' })).toBe(true)
    s = assignVersePin('z', 'red', { reference: 'A', sectionId: '1', subsectionId: '2' })
    expect(shouldAdvanceYellowLastViewed(s, { reference: 'A', sectionId: '1', subsectionId: '2' })).toBe(false)
  })

  test('clearVersePinsMatchingRow clears bookmarks and skips yellow tied to bookmarked row', () => {
    const slug = 'pq'
    assignVersePin(slug, 'red', {
      reference: 'A',
      sectionId: 's1',
      subsectionId: 'a',
    })
    assignVersePin(slug, 'blue', {
      reference: 'B',
      sectionId: 's2',
      subsectionId: 'b',
    })
    assignYellowLastViewed(slug, {
      reference: 'A',
      sectionId: 's1',
      subsectionId: 'a',
    })
    clearVersePinsMatchingRow(slug, {
      reference: 'A',
      sectionId: 's1',
      subsectionId: 'a',
    })
    const m = loadVersePins(slug)
    expect(m.bookmarks.every((b) => b.reference !== 'A')).toBe(true)
    expect(m.yellow).toBeNull()
    expect(m.bookmarks.find((b) => b.reference === 'B')).toBeTruthy()
  })

  test('assignVersePin clears other bookmarks pinned to same row', () => {
    const slug = 'p1'
    assignVersePin(slug, 'red', {
      reference: 'John 3:16',
      sectionId: 'modal-view',
      subsectionId: 'modal-view',
    })
    assignVersePin(slug, 'blue', {
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 'ss1',
    })
    const m = loadVersePins(slug)
    expect(m.bookmarks.filter((b) => b.reference === 'John 3:16')).toHaveLength(1)
    expect(m.bookmarks[0]?.colorId).toBe('blue')
    expect(m.bookmarks[0]?.sectionId).toBe('s1')
  })

  test('same bookmark color allowed on multiple different passages', () => {
    const slug = 'dup'
    assignVersePin(slug, 'red', { reference: 'A', sectionId: 's1', subsectionId: 'a' })
    assignVersePin(slug, 'red', { reference: 'B', sectionId: 's2', subsectionId: 'b' })
    const m = loadVersePins(slug)
    const reds = m.bookmarks.filter((b) => b.colorId === 'red')
    expect(reds).toHaveLength(2)
  })

  test('availablePinColorsForModalChoice returns bookmark colors only (no yellow)', () => {
    const anchors = { reference: 'B 2:2', sectionId: 's2', subsectionId: 'b' }
    assignVersePin('x', 'red', { reference: 'A 1:1', sectionId: 's1', subsectionId: 'a' })
    const after = loadVersePins('x')
    expect(availablePinColorsForModalChoice(after, anchors)).toEqual(['red', 'blue', 'green', 'violet'])
  })

  test('removeVersePinByColor removes first bookmark of that color', () => {
    const slug = 'p9'
    assignVersePin(slug, 'red', { reference: 'X', sectionId: 'a', subsectionId: 'b' })
    const after = removeVersePinByColor(slug, 'red')
    expect(after.bookmarks.filter((b) => b.colorId === 'red')).toHaveLength(0)
  })

  test('removeVersePin clears yellow', () => {
    const slug = 'pyel'
    assignYellowLastViewed(slug, { reference: 'Q', sectionId: '1', subsectionId: '2' })
    const after = removeVersePin(slug, { kind: 'yellow' })
    expect(after.yellow).toBeNull()
  })

  test('removeVersePin clears one bookmark id', () => {
    const slug = 'pb'
    assignVersePin(slug, 'violet', { reference: 'Z', sectionId: '', subsectionId: '' })
    const id = loadVersePins(slug).bookmarks[0]!.id
    const after = removeVersePin(slug, { kind: 'bookmark', bookmarkId: id })
    expect(after.bookmarks).toHaveLength(0)
  })

  test('clearAllVersePins removes storage item when last bookmark removed indirectly', () => {
    assignVersePin('pc', 'yellow', {
      reference: 'Q',
      sectionId: '1',
      subsectionId: '2',
    })
    removeVersePin('pc', { kind: 'yellow' })
    expect(localStorage.getItem(versePinStorageKey('pc'))).toBeNull()
  })

  test('invalid JSON yields empty state', () => {
    localStorage.setItem(versePinStorageKey('bad'), '{{')
    expect(loadVersePins('bad').bookmarks).toHaveLength(0)
  })

  test('v1 byColor payload migrates to v2 on load', () => {
    const slug = 'v1m'
    localStorage.setItem(
      versePinStorageKey(slug),
      JSON.stringify({
        v: 1,
        byColor: {
          red: { reference: 'Gen 1:1', sectionId: 's', subsectionId: 't' },
          blue: null,
          yellow: { reference: 'Jn 1:1', sectionId: 'm', subsectionId: 'n' },
          green: null,
          violet: null,
        },
      })
    )
    loadVersePins(slug)
    const raw = localStorage.getItem(versePinStorageKey(slug))!
    const parsed = JSON.parse(raw)
    expect(parsed.v).toBe(2)
    expect(parsed.bookmarks).toHaveLength(1)
    expect(parsed.yellow.reference).toBe('Jn 1:1')
  })

  test('parseLegacyScriptureProgress ignores viewedAt', () => {
    const slot = parseLegacyScriptureProgress(
      JSON.stringify({
        reference: 'Rom 8:1',
        sectionId: '1',
        subsectionId: 'b',
        viewedAt: '2020-01-01T00:00:00.000Z',
      })
    )
    expect(slot).toEqual({
      reference: 'Rom 8:1',
      sectionId: '1',
      subsectionId: 'b',
    })
  })

  test('parseLegacyScriptureProgress normalizes empty anchors to modal-view', () => {
    const slot = parseLegacyScriptureProgress(
      JSON.stringify({ reference: 'John 3:16', sectionId: '', subsectionId: '' })
    )
    expect(slot).toEqual({
      reference: 'John 3:16',
      sectionId: 'modal-view',
      subsectionId: 'modal-view',
    })
  })

  test('loadVersePins migrates legacy gospel-scripture-progress into yellow and removes legacy key', () => {
    const slug = 'migrate-me'
    const legacyKey = legacyScriptureProgressStorageKey(slug)
    localStorage.setItem(
      legacyKey,
      JSON.stringify({
        reference: 'John 3:16',
        sectionId: '',
        subsectionId: '',
        viewedAt: '2025-04-01T12:00:00.000Z',
      })
    )

    const state = loadVersePins(slug)
    expect(state.yellow?.reference).toBe('John 3:16')
    expect(state.yellow?.sectionId).toBe('modal-view')
    expect(localStorage.getItem(legacyKey)).toBeNull()
    const rawNew = localStorage.getItem(versePinStorageKey(slug))
    expect(rawNew).toBeTruthy()
    expect(JSON.parse(rawNew!).v).toBe(2)
    expect(JSON.parse(rawNew!).yellow.reference).toBe('John 3:16')
  })

  test('loadVersePins keeps legacy key when persist fails (e.g. quota exceeded)', () => {
    const slug = 'quota'
    const legacyKey = legacyScriptureProgressStorageKey(slug)
    const legacyPayload = JSON.stringify({
      reference: 'Ex 20:1',
      sectionId: '',
      subsectionId: '',
    })
    localStorage.setItem(legacyKey, legacyPayload)

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota has been exceeded', 'QuotaExceededError')
    })

    const state = loadVersePins(slug)
    expect(state.yellow?.reference).toBe('Ex 20:1')
    expect(localStorage.getItem(legacyKey)).toBe(legacyPayload)
    expect(localStorage.getItem(versePinStorageKey(slug))).toBeNull()

    setItemSpy.mockRestore()
  })

  test('loadVersePins does not migrate when verse pins already exist; drops stale legacy key', () => {
    const slug = 'has-new'
    assignVersePin(slug, 'red', { reference: 'A', sectionId: 's', subsectionId: 't' })
    const legacyKey = legacyScriptureProgressStorageKey(slug)
    localStorage.setItem(
      legacyKey,
      JSON.stringify({ reference: 'Luke 1:1', sectionId: '', subsectionId: '' })
    )

    const state = loadVersePins(slug)
    expect(state.bookmarks[0]?.reference).toBe('A')
    expect(state.yellow).toBeNull()
    expect(localStorage.getItem(legacyKey)).toBeNull()
  })

  test('loadVersePins skips invalid legacy data without migrating', () => {
    const slug = 'legacy-bad'
    const legacyKey = legacyScriptureProgressStorageKey(slug)
    localStorage.setItem(legacyKey, '{"notReference":true}')
    const state = loadVersePins(slug)
    expect(state.yellow).toBeNull()
    expect(localStorage.getItem(legacyKey)).not.toBeNull()
  })

  test('versePinsListFromState lists bookmarks before yellow when both present', () => {
    assignVersePin('pl', 'red', { reference: 'A', sectionId: '1', subsectionId: '2' })
    assignYellowLastViewed('pl', { reference: 'B', sectionId: '3', subsectionId: '4' })
    const list = versePinsListFromState(loadVersePins('pl'))
    expect(list[0]?.colorId).toBe('red')
    expect(list[list.length - 1]?.colorId).toBe('yellow')
  })
})
