import { buildProfileFavoriteScriptureReferences } from '@/lib/buildProfileFavoriteScriptureReferences'
import type { GospelSection } from '@/lib/types'

describe('buildProfileFavoriteScriptureReferences', () => {
  it('collects favorite references in profile order', () => {
    const sections: GospelSection[] = [
      {
        section: '1',
        title: 'One',
        subsections: [
          {
            title: 'A',
            scriptureReferences: [
              { reference: 'John 3:16', favorite: true },
              { reference: 'Romans 8:1' },
            ],
            nestedSubsections: [
              {
                title: 'Nested',
                scriptureReferences: [{ reference: 'Psalm 23:1', favorite: true }],
              },
            ],
          },
        ],
      },
    ]

    expect(buildProfileFavoriteScriptureReferences(sections)).toEqual(['John 3:16', 'Psalm 23:1'])
  })
})
