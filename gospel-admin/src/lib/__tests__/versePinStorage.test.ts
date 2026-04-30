/**
 * @jest-environment jsdom
 */

import {
  assignVersePin,
  assignYellowLastViewed,
  availablePinColorsForModalChoice,
  anchoredPinMatchesDisplayRow,
  clearAllVersePins,
  clearVersePinsMatchingRow,
  loadVersePins,
  pinnedVerseMatchesRow,
  removeVersePinByColor,
  versePinStorageKey,
  versePinsListFromMap,
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

  test('assignVersePin sets slot and persists', () => {
    const slug = 'p1'
    const map = assignVersePin(slug, 'red', {
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 'ss1',
    })
    expect(map.red).toEqual({
      reference: 'John 3:16',
      sectionId: 's1',
      subsectionId: 'ss1',
    })

    expect(loadVersePins(slug).red?.reference).toBe('John 3:16')
  })

  test('assignYellowLastViewed moves yellow only — keeps red on same verse row', () => {
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
    expect(m.red).toEqual(row)
    expect(m.yellow).toEqual(row)
  })

  test('clearVersePinsMatchingRow clears every pin for that row only', () => {
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
    expect(m.red).toBeNull()
    expect(m.yellow).toBeNull()
    expect(m.blue?.reference).toBe('B')
  })

  test('assignVersePin clears other colors that pinned the same row', () => {
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
    expect(m.red).toBeNull()
    expect(m.blue?.sectionId).toBe('s1')
  })

  test('availablePinColorsForModalChoice excludes taken colors unless same passage', () => {
    const map = loadVersePins('x')
    map.red = { reference: 'A 1:1', sectionId: 's1', subsectionId: 'a' }
    map.blue = null
    const anchors = { reference: 'B 2:2', sectionId: 's2', subsectionId: 'b' }
    const avail = availablePinColorsForModalChoice(map, anchors)
    expect(avail).toContain('blue')
    expect(avail).not.toContain('red')

    const anchorsA = { reference: 'A 1:1', sectionId: 's1', subsectionId: 'a' }
    const availAgain = availablePinColorsForModalChoice(map, anchorsA)
    expect(availAgain).toContain('red')
    expect(availAgain).toContain('blue')
  })

  test('removeVersePinByColor clears one slot', () => {
    const slug = 'p9'
    assignVersePin(slug, 'red', { reference: 'X', sectionId: 'a', subsectionId: 'b' })
    const after = removeVersePinByColor(slug, 'red')
    expect(after.red).toBeNull()
  })

  test('removeVersePinByColor removes storage when last pin cleared', () => {
    const slug = 'pa'
    assignVersePin(slug, 'green', { reference: 'Y', sectionId: 'a', subsectionId: 'b' })
    removeVersePinByColor(slug, 'green')
    expect(localStorage.getItem(versePinStorageKey(slug))).toBeNull()
    expect(loadVersePins(slug).green).toBeNull()
  })

  test('versePinsListFromMap returns non-null entries with colorId', () => {
    assignVersePin('pb', 'violet', { reference: 'Z', sectionId: '', subsectionId: '' })
    const list = versePinsListFromMap(loadVersePins('pb'))
    expect(list).toHaveLength(1)
    expect(list[0]!.colorId).toBe('violet')

    assignVersePin('pb', 'red', { reference: 'Z2', sectionId: 'm', subsectionId: 'n' })
    const list2 = versePinsListFromMap(loadVersePins('pb'))
    expect(list2).toHaveLength(2)
  })

  test('clearAllVersePins removes item', () => {
    assignVersePin('pc', 'yellow', { reference: 'Q', sectionId: '1', subsectionId: '2' })
    clearAllVersePins('pc')
    expect(localStorage.getItem(versePinStorageKey('pc'))).toBeNull()
  })

  test('invalid JSON yields empty map', () => {
    localStorage.setItem(versePinStorageKey('bad'), '{{')
    expect(loadVersePins('bad').red).toBeNull()
  })
})
