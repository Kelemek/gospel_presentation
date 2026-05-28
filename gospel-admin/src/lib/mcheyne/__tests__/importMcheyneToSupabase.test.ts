import { MCHEYNE_SLUG } from '@/lib/mcheyne/mcheyneSlug'
import { importMcheyneToSupabase } from '@/lib/mcheyne/importMcheyneToSupabase'
import type { ParsedMcheynePlan } from '@/lib/mcheyne/buildMcheyneGospelData'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const parsed: ParsedMcheynePlan = {
  slug: MCHEYNE_SLUG,
  title: "M'Cheyne Reading Plan",
  gospelData: [
    {
      section: 'day-1',
      title: 'Day 1',
      subsections: [{ title: 'Genesis 1', content: '<p>Reading</p>' }],
    },
  ],
  passageKeys: ['GEN.1.1'],
}

describe('importMcheyneToSupabase', () => {
  it('inserts the M\'Cheyne plan profile and passage index rows', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importMcheyneToSupabase(supabase as never, parsed)

    expect(result.slug).toBe(MCHEYNE_SLUG)
    expect(result.action).toBe('inserted')
    expect(result.sectionCount).toBe(1)
    expect(result.subsectionCount).toBe(1)
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(1)
    expect(getInserted()?.slug).toBe(MCHEYNE_SLUG)
    expect(getInserted()?.include_in_resources_menu).toBe(true)
    expect((getIndexRows() as unknown[])?.length).toBe(result.passageKeyCount)
  })

  it('updates an existing profile', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: { id: 'profile-existing' },
    })

    const result = await importMcheyneToSupabase(supabase as never, parsed)

    expect(result.action).toBe('updated')
    expect(getUpdated()?.title).toBe("M'Cheyne Reading Plan")
  })

  it('skips passage index when finalize produces no keys', async () => {
    const introOnly: ParsedMcheynePlan = {
      ...parsed,
      gospelData: [
        {
          section: 'intro',
          title: 'Intro',
          subsections: [{ title: 'Welcome', content: '<p>No refs</p>' }],
        },
      ],
      passageKeys: [],
    }
    const { supabase, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importMcheyneToSupabase(supabase as never, introOnly)

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws on lookup, update, insert, delete index, and index insert errors', async () => {
    const { supabase: lookupFail } = createMockCcelProfileImportSupabase({
      selectError: { message: 'db' },
    })
    await expect(importMcheyneToSupabase(lookupFail as never, parsed)).rejects.toThrow(/Lookup mchy/)

    const { supabase: updateFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      updateError: { message: 'denied' },
    })
    await expect(importMcheyneToSupabase(updateFail as never, parsed)).rejects.toThrow(/Update mchy/)

    const { supabase: insertFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: { message: 'dup' },
    })
    await expect(importMcheyneToSupabase(insertFail as never, parsed)).rejects.toThrow(/Insert mchy/)

    const { supabase: noId } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: null,
    })
    await expect(importMcheyneToSupabase(noId as never, parsed)).rejects.toThrow(/Insert mchy/)

    const { supabase: delFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(importMcheyneToSupabase(delFail as never, parsed)).rejects.toThrow(/Clear index/)

    const { supabase: idxFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx' },
    })
    await expect(importMcheyneToSupabase(idxFail as never, parsed)).rejects.toThrow(/Index mchy/)
  })
})
