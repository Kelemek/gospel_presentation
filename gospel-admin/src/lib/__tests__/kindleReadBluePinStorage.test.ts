/**
 * @jest-environment jsdom
 */

import {
  isKindleReadBluePinOnRow,
  kindleReadBluePinsStorageKey,
  loadKindleReadBluePins,
  toggleKindleReadBluePin,
} from '@/lib/kindleReadBluePinStorage'

describe('kindleReadBluePinStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses a Kindle-only storage key', () => {
    expect(kindleReadBluePinsStorageKey('default')).toBe('kindle-read-blue-pins-default')
  })

  it('starts empty', () => {
    expect(loadKindleReadBluePins('default')).toEqual({ v: 1, pins: [] })
  })

  it('toggle adds a pin and reports pinned', () => {
    const entry = {
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    }
    const result = toggleKindleReadBluePin('default', entry)
    expect(result.pinned).toBe(true)
    expect(result.state.pins).toHaveLength(1)
    expect(result.state.pins[0]).toMatchObject(entry)
    expect(isKindleReadBluePinOnRow('default', entry)).toBe(true)
  })

  it('toggle removes an existing pin on the same row', () => {
    const entry = {
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    }
    toggleKindleReadBluePin('default', entry)
    const result = toggleKindleReadBluePin('default', entry)
    expect(result.pinned).toBe(false)
    expect(result.state.pins).toHaveLength(0)
    expect(isKindleReadBluePinOnRow('default', entry)).toBe(false)
  })

  it('supports multiple pins on different rows', () => {
    toggleKindleReadBluePin('default', {
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
    toggleKindleReadBluePin('default', {
      reference: 'Romans 8:1',
      sectionId: 'section-2',
      subsectionId: 'section-2-0',
    })
    expect(loadKindleReadBluePins('default').pins).toHaveLength(2)
  })

  it('pin, unpin, and re-pin keeps a single entry', () => {
    const entry = {
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    }
    toggleKindleReadBluePin('default', entry)
    toggleKindleReadBluePin('default', entry)
    toggleKindleReadBluePin('default', entry)
    expect(loadKindleReadBluePins('default').pins).toHaveLength(1)
  })

  it('does not write to main-app verse pin keys', () => {
    toggleKindleReadBluePin('default', {
      reference: 'John 3:16',
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
    expect(localStorage.getItem('gospel-verse-pins-default')).toBeNull()
  })

  it('matches pins by kindleAnchor when reference strings differ', () => {
    toggleKindleReadBluePin(
      'default',
      {
        reference: 'John 3:16-17',
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
      },
      { kindleAnchor: 'section-1-0-card-0' }
    )
    expect(
      isKindleReadBluePinOnRow(
        'default',
        {
          reference: 'John 3:16',
          sectionId: 'section-1',
          subsectionId: 'section-1-0',
        },
        { kindleAnchor: 'section-1-0-card-0' }
      )
    ).toBe(true)
  })
})
