import type { GospelSection } from '@/lib/types'
import { findFirstScriptureCardAnchors } from '../findFirstScriptureCardAnchors'

describe('findFirstScriptureCardAnchors', () => {
  const dupSections: GospelSection[] = [
    {
      section: '1',
      title: 'S1',
      subsections: [
        {
          title: 'A',
          content: '',
          scriptureReferences: [{ reference: 'Rom 8:28' }],
        },
        {
          title: 'B',
          content: '',
          scriptureReferences: [{ reference: 'Rom 8:28' }],
        },
      ],
    },
  ]

  it('returns the first matching card when the same reference appears twice', () => {
    expect(findFirstScriptureCardAnchors(dupSections, 'Rom 8:28')).toEqual({
      sectionId: 'section-1',
      subsectionId: 'section-1-0',
    })
  })

  it('returns nested subsection id when the reference is only under nested', () => {
    const nestedOnly: GospelSection[] = [
      {
        section: 'x',
        title: 'Sx',
        subsections: [
          {
            title: 'Outer',
            content: 'c',
            nestedSubsections: [
              { title: 'N', content: 'c', scriptureReferences: [{ reference: 'Psalm 23:1' }] },
            ],
          },
        ],
      },
    ]
    expect(findFirstScriptureCardAnchors(nestedOnly, 'Psalm 23:1')).toEqual({
      sectionId: 'section-x',
      subsectionId: 'section-x-0-0',
    })
  })

  it('returns null when reference is not on a card', () => {
    expect(findFirstScriptureCardAnchors(dupSections, 'John 1:1')).toBeNull()
  })
})
