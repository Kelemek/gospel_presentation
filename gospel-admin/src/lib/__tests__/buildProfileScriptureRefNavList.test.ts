import { buildProfileScriptureRefNavList } from '@/lib/buildProfileScriptureRefNavList'
import type { GospelSection } from '@/lib/types'

describe('buildProfileScriptureRefNavList', () => {
  it('flattens main and nested scripture cards with anchors', () => {
    const sections: GospelSection[] = [
      {
        section: '1',
        title: 'Section <em>One</em>',
        subsections: [
          {
            title: 'Sub A',
            scriptureReferences: [{ reference: 'John 3:16' }],
            nestedSubsections: [
              {
                title: 'Nested B',
                scriptureReferences: [{ reference: 'Romans 8:1' }],
              },
            ],
          },
        ],
      },
    ]

    expect(buildProfileScriptureRefNavList(sections)).toEqual([
      {
        reference: 'John 3:16',
        sectionId: 'section-1',
        subsectionId: 'section-1-0',
        sectionTitle: 'Section One',
        subsectionTitle: 'Sub A',
      },
      {
        reference: 'Romans 8:1',
        sectionId: 'section-1',
        subsectionId: 'section-1-0-0',
        sectionTitle: 'Section One',
        subsectionTitle: 'Sub A',
        nestedSubsectionTitle: 'Nested B',
      },
    ])
  })
})
