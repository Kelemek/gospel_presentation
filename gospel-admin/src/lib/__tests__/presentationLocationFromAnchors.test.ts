import type { GospelSection } from '@/lib/types'
import {
  presentationLocationFromProfileAnchors,
} from '@/lib/presentationLocationFromAnchors'

function sectionsFixture(): GospelSection[] {
  return [
    {
      section: '1',
      title: '<p>Section A</p>',
      subsections: [
        {
          title: 'Sub One',
          content: 'c',
          scriptureReferences: [],
          nestedSubsections: [
            {
              title: 'Nested N',
              content: 'n',
              scriptureReferences: [],
            },
          ],
        },
      ],
    },
  ]
}

describe('presentationLocationFromProfileAnchors', () => {
  it('resolves subsection anchor without scripture cards', () => {
    const loc = presentationLocationFromProfileAnchors(sectionsFixture(), 'section-1', 'section-1-0')
    expect(loc).toEqual({
      sectionTitle: 'Section A',
      subsectionTitle: 'Sub One',
    })
  })

  it('resolves nested anchor', () => {
    const loc = presentationLocationFromProfileAnchors(sectionsFixture(), 'section-1', 'section-1-0-0')
    expect(loc).toEqual({
      sectionTitle: 'Section A',
      subsectionTitle: 'Sub One',
      nestedSubsectionTitle: 'Nested N',
    })
  })

  it('returns subsectionTitle empty when anchor is section header only', () => {
    const loc = presentationLocationFromProfileAnchors(sectionsFixture(), 'section-1', 'section-1')
    expect(loc).toEqual({
      sectionTitle: 'Section A',
      subsectionTitle: '',
    })
  })

  it('returns null when subsection id does not extend section id', () => {
    expect(presentationLocationFromProfileAnchors(sectionsFixture(), 'section-1', 'section-2-0')).toBeNull()
  })

  it('returns null for malformed numeric segments', () => {
    expect(presentationLocationFromProfileAnchors(sectionsFixture(), 'section-1', 'section-1-01')).toBeNull()
  })

  it('returns null when more than nested depth in id', () => {
    const s = sectionsFixture()
    expect(presentationLocationFromProfileAnchors(s, 'section-1', 'section-1-0-0-1')).toBeNull()
  })
})
