import type { GospelSection } from '@/lib/types'
import { findFirstStudyPassageAnchor } from '../findFirstStudyPassageAnchor'

describe('findFirstStudyPassageAnchor', () => {
  it('returns first subsection when a scripture card overlaps the lookup reference', () => {
    const sections: GospelSection[] = [
      {
        section: '1',
        title: 'S1',
        subsections: [
          {
            title: 'First match',
            content: '',
            scriptureReferences: [{ reference: 'Rom 8:28' }],
          },
          {
            title: 'Second match',
            content: '',
            scriptureReferences: [{ reference: 'Romans 8:28' }],
          },
        ],
      },
    ]
    expect(findFirstStudyPassageAnchor(sections, 'Romans 8:28')).toEqual({
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
  })

  it('matches Calvin-style subsection titles without scripture cards', () => {
    const sections: GospelSection[] = [
      {
        section: 'deu',
        title: 'Deuteronomy',
        subsections: [
          { title: 'Deuteronomy 6:1-19', content: '<p>Intro</p>' },
          { title: 'Deuteronomy 6:20-25', content: '<p>Commentary</p>' },
        ],
      },
    ]
    expect(findFirstStudyPassageAnchor(sections, 'Deuteronomy 6:20-25')).toEqual({
      sectionId: 'section-deu',
      subsectionId: 'section-deu-1',
    })
  })

  it('prefers subsection title over an earlier footnote in body', () => {
    const sections: GospelSection[] = [
      {
        section: 'cvheb',
        title: 'Hebrews',
        subsections: [
          {
            title: 'Hebrews 1:1-2',
            content:
              '<p>See also <scripRef passage="Hebrews 11:1">Hebrews 11:1</scripRef> for faith.</p>',
          },
          { title: 'Hebrews 11:1-3', content: '<p>Now faith is the substance of things hoped for.</p>' },
        ],
      },
    ]
    expect(findFirstStudyPassageAnchor(sections, 'Hebrews 11:1')).toEqual({
      sectionId: 'section-cvheb',
      subsectionId: 'section-cvheb-1',
    })
  })

  it('matches inline body references when cards and titles do not match', () => {
    const sections: GospelSection[] = [
      {
        section: '1',
        title: 'S',
        subsections: [
          {
            title: 'No card',
            content: '<p>Paul writes in Romans 8:28 that God works all things.</p>',
          },
        ],
      },
    ]
    expect(findFirstStudyPassageAnchor(sections, 'Romans 8:28')).toEqual({
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
  })

  it('returns nested subsection id when only nested content matches', () => {
    const sections: GospelSection[] = [
      {
        section: 'x',
        title: 'Sx',
        subsections: [
          {
            title: 'Outer',
            content: 'c',
            nestedSubsections: [
              {
                title: 'Inner',
                content: '<p>The Lord is my shepherd (Psalm 23:1).</p>',
              },
            ],
          },
        ],
      },
    ]
    expect(findFirstStudyPassageAnchor(sections, 'Psalm 23')).toEqual({
      sectionId: 'section-x',
      subsectionId: 'section-x-0-0',
    })
  })

  it('returns null when nothing overlaps the lookup reference', () => {
    const sections: GospelSection[] = [
      {
        section: '1',
        title: 'S',
        subsections: [{ title: 'A', content: '<p>Genesis 1:1</p>' }],
      },
    ]
    expect(findFirstStudyPassageAnchor(sections, 'Revelation 22:21')).toBeNull()
  })
})
