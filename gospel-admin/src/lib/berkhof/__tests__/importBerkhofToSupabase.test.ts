import { BERKHOF_ST_SLUG } from '@/lib/berkhof/berkhofSlug'
import type { ParsedBerkhofSystematicTheology } from '@/lib/berkhof/ccelBerkhofHtml'
import { importBerkhofToSupabase } from '@/lib/berkhof/importBerkhofToSupabase'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const parsed: ParsedBerkhofSystematicTheology = {
  slug: BERKHOF_ST_SLUG,
  title: 'Systematic Theology (Louis Berkhof)',
  gospelData: [
    {
      section: '1',
      title: 'Part One: The Doctrine of God',
      subsections: [
        {
          title: 'The Being of God — I. The Existence of God',
          content: '<p>Hebrews 11:6</p>',
          scriptureReferences: [{ reference: 'Hebrews 11:6', favorite: false }],
        },
      ],
    },
  ],
  passageKeys: ['HEB.11.6'],
}

describe('importBerkhofToSupabase', () => {
  it('inserts a new Berkhof profile and passage index rows', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importBerkhofToSupabase(supabase as never, parsed)

    expect(result.slug).toBe(BERKHOF_ST_SLUG)
    expect(result.action).toBe('inserted')
    expect(result.sectionCount).toBe(1)
    expect(result.subsectionCount).toBe(1)
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(1)
    expect(getInserted()?.slug).toBe(BERKHOF_ST_SLUG)
    expect(getInserted()?.include_in_resources_menu).toBe(true)
    expect((getIndexRows() as unknown[])?.length).toBe(result.passageKeyCount)
  })

  it('updates an existing profile', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: { id: 'profile-existing' },
    })

    const result = await importBerkhofToSupabase(supabase as never, parsed)

    expect(result.action).toBe('updated')
    expect(getUpdated()?.title).toBe('Systematic Theology (Louis Berkhof)')
  })
})
