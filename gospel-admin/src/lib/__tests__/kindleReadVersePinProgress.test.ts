/**
 * @jest-environment jsdom
 */

import { toggleKindleReadBluePin } from '@/lib/kindleReadBluePinStorage'
import {
  kindleReadLastCardStorageKey,
  loadKindleReadLastCard,
  saveKindleReadLastCard,
} from '@/lib/kindleReadLastCardStorage'
import {
  applyKindleReadVersePinHighlights,
  applyKindleReadVersePinHighlightsWithScroll,
  isKindleReadScriptureCardAnchor,
  kindleReadProfileSlugFromPathname,
  saveKindleReadLastScriptureCard,
  versePinEntryFromKindleScriptureParams,
} from '@/lib/kindleReadVersePinProgress'

describe('kindleReadLastCardStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('uses a Kindle-only storage key', () => {
    expect(kindleReadLastCardStorageKey('mchy')).toBe('kindle-read-last-card-mchy')
  })

  it('save/load round-trip', () => {
    saveKindleReadLastCard('mchy', {
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })
    expect(loadKindleReadLastCard('mchy')).toEqual({
      v: 1,
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })
  })

  it('normalizes compact anchor-only payloads from the inline script', () => {
    localStorage.setItem(
      kindleReadLastCardStorageKey('mchy'),
      JSON.stringify({
        v: 1,
        reference: 'Genesis 1',
        anchor: 'section-jan-0-1-card-0',
      })
    )
    expect(loadKindleReadLastCard('mchy')).toEqual({
      v: 1,
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })
  })
})

describe('kindleReadVersePinProgress', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('detects scripture card anchors', () => {
    expect(isKindleReadScriptureCardAnchor('section-jan-5-0-card-2')).toBe(true)
    expect(isKindleReadScriptureCardAnchor('section-jan-5-0')).toBe(false)
  })

  it('parses profile slug from read pathname', () => {
    expect(kindleReadProfileSlugFromPathname('/mchy/read/')).toBe('mchy')
    expect(kindleReadProfileSlugFromPathname('/read/scripture/')).toBeNull()
  })

  it('builds verse pin entry from Kindle scripture URL params', () => {
    expect(
      versePinEntryFromKindleScriptureParams(
        'mchy',
        'Genesis 1',
        'section-jan-0-1-card-0'
      )
    ).toEqual({
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })
  })

  it('saveKindleReadLastScriptureCard writes Kindle-only storage', () => {
    const saved = saveKindleReadLastScriptureCard(
      'mchy',
      'Genesis 1',
      'section-jan-0-1-card-0'
    )
    expect(saved).toBe(true)
    expect(loadKindleReadLastCard('mchy')).toEqual({
      v: 1,
      reference: 'Genesis 1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })
    expect(localStorage.getItem('gospel-verse-pins-mchy')).toBeNull()
  })

  it('does not save M\'Cheyne progress for inline body links without card anchor', () => {
    expect(
      saveKindleReadLastScriptureCard('mchy', 'Genesis 1', 'section-jan-0-1')
    ).toBe(false)
    expect(loadKindleReadLastCard('mchy')).toBeNull()
  })

  it('applyKindleReadVersePinHighlights marks the matching card', () => {
    saveKindleReadLastCard('mchy', {
      reference: 'John 3:16',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })

    document.body.innerHTML = `
      <span id="section-jan-0-1-card-0" class="kindle-read-scripture-card">
        <a class="kindle-read-scripture-link" href="#">John 3:16</a>
      </span>
      <span id="section-jan-0-1-card-1" class="kindle-read-scripture-card">
        <a class="kindle-read-scripture-link" href="#">Romans 8:1</a>
      </span>
    `

    applyKindleReadVersePinHighlights('mchy')

    expect(document.getElementById('section-jan-0-1-card-0')).toHaveClass(
      'kindle-read-scripture-card--yellow-pin'
    )
    expect(document.getElementById('section-jan-0-1-card-1')).not.toHaveClass(
      'kindle-read-scripture-card--yellow-pin'
    )
  })

  it('applyKindleReadVersePinHighlights marks blue-pinned cards', () => {
    toggleKindleReadBluePin('mchy', {
      reference: 'Romans 8:1',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })

    document.body.innerHTML = `
      <span id="section-jan-0-1-card-0" class="kindle-read-scripture-card">
        <a class="kindle-read-scripture-link" href="#">John 3:16</a>
      </span>
      <span id="section-jan-0-1-card-1" class="kindle-read-scripture-card">
        <a class="kindle-read-scripture-link" href="#">Romans 8:1</a>
      </span>
    `

    applyKindleReadVersePinHighlights('mchy')

    expect(document.getElementById('section-jan-0-1-card-1')).toHaveClass(
      'kindle-read-scripture-card--blue-pin'
    )
    expect(document.getElementById('section-jan-0-1-card-0')).not.toHaveClass(
      'kindle-read-scripture-card--blue-pin'
    )
  })

  it('applyKindleReadVersePinHighlights can mark yellow and blue on the same card', () => {
    saveKindleReadLastCard('mchy', {
      reference: 'John 3:16',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })
    toggleKindleReadBluePin('mchy', {
      reference: 'John 3:16',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })

    document.body.innerHTML = `
      <span id="section-jan-0-1-card-0" class="kindle-read-scripture-card">
        <a class="kindle-read-scripture-link" href="#">John 3:16</a>
      </span>
    `

    applyKindleReadVersePinHighlights('mchy')

    const card = document.getElementById('section-jan-0-1-card-0')
    expect(card).toHaveClass('kindle-read-scripture-card--yellow-pin')
    expect(card).toHaveClass('kindle-read-scripture-card--blue-pin')
  })

  it('applyKindleReadVersePinHighlights clears stale pin classes before re-applying', () => {
    document.body.innerHTML = `
      <span id="section-jan-0-1-card-0" class="kindle-read-scripture-card kindle-read-scripture-card--yellow-pin kindle-read-scripture-card--blue-pin">
        <a class="kindle-read-scripture-link" href="#">John 3:16</a>
      </span>
    `

    applyKindleReadVersePinHighlights('mchy')

    expect(document.getElementById('section-jan-0-1-card-0')).not.toHaveClass(
      'kindle-read-scripture-card--yellow-pin'
    )
    expect(document.getElementById('section-jan-0-1-card-0')).not.toHaveClass(
      'kindle-read-scripture-card--blue-pin'
    )
  })

  it('applyKindleReadVersePinHighlightsWithScroll skips resume scroll for subsection hash', () => {
    saveKindleReadLastCard('mchy', {
      reference: 'John 3:16',
      sectionId: 'section-jan',
      subsectionId: 'section-jan-0-1',
    })

    const card = document.createElement('span')
    card.id = 'section-jan-0-1-card-0'
    card.className = 'kindle-read-scripture-card'
    card.innerHTML = '<a class="kindle-read-scripture-link" href="#">John 3:16</a>'
    const scrollIntoView = jest.fn()
    card.scrollIntoView = scrollIntoView
    document.body.innerHTML = ''
    document.body.appendChild(card)

    window.location.hash = '#section-may-26'
    applyKindleReadVersePinHighlightsWithScroll('mchy', { scrollIntoView: true })
    expect(scrollIntoView).not.toHaveBeenCalled()

    window.location.hash = '#section-jan-0-1-card-0'
    applyKindleReadVersePinHighlightsWithScroll('mchy', { scrollIntoView: true })
    expect(scrollIntoView).toHaveBeenCalled()
  })
})
