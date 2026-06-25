import {
  collectKindleReadScriptureCardNavEntries,
  kindleReadScriptureAnchorLookup,
  kindleReadScriptureCardNav,
} from '@/lib/kindleReadScriptureCardNav'
import type { GospelPresentationData } from '@/lib/types'

const sampleSections: GospelPresentationData = [
  {
    section: '1',
    title: 'Intro',
    subsections: [
      {
        title: 'Key passages',
        content: '<p>God is holy.</p>',
        scriptureReferences: [
          { reference: 'Deuteronomy 4:35' },
          { reference: 'John 3:16' },
        ],
      },
      {
        title: 'Inline only',
        content: '<p>See Romans 3:23 for sin.</p>',
        scriptureReferences: [{ reference: 'Romans 3:23' }],
      },
    ],
  },
]

describe('kindleReadScriptureCardNav', () => {
  it('collects visible scripture cards in profile order', () => {
    const cards = collectKindleReadScriptureCardNavEntries(sampleSections)
    expect(cards.map((c) => c.reference)).toEqual(['Deuteronomy 4:35', 'John 3:16'])
    expect(cards[0]?.kindleAnchor).toBe('section-1-0-card-0')
    expect(cards[1]?.kindleAnchor).toBe('section-1-0-card-1')
  })

  it('skips cards hidden when subsection body has inline refs', () => {
    const cards = collectKindleReadScriptureCardNavEntries(sampleSections)
    expect(cards.some((c) => c.reference === 'Romans 3:23')).toBe(false)
  })

  it('parses anchor param into section and subsection ids', () => {
    expect(kindleReadScriptureAnchorLookup('section-1-0-card-1')).toEqual({
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
  })

  it('builds prev/next links through scripture cards on the profile', () => {
    const nav = kindleReadScriptureCardNav(
      sampleSections,
      'John 3:16',
      'default',
      'section-1-0-card-1'
    )
    expect(nav.prev?.label).toBe('Previous passage (Deuteronomy 4:35)')
    expect(nav.prev?.href).toContain('ref=Deuteronomy+4%3A35')
    expect(nav.prev?.href).toContain('anchor=section-1-0-card-0')
    expect(nav.next).toBeNull()
  })

  it('includes translation in prev/next scripture urls', () => {
    const nav = kindleReadScriptureCardNav(
      sampleSections,
      'John 3:16',
      'default',
      'section-1-0-card-1',
      'kjv'
    )
    expect(nav.prev?.href).toContain('translation=kjv')
  })
})
