import { LUTHER_GALATIANS_SLUG } from '@/lib/luther/lutherSlug'
import { importLutherGalatiansToSupabase } from '@/lib/luther/importLutherGalatiansToSupabase'
import type { ParsedLutherGalatians } from '@/lib/luther/ccelLutherGalatiansHtml'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const parsed: ParsedLutherGalatians = {
  slug: LUTHER_GALATIANS_SLUG,
  title: 'Commentary on Galatians',
  gospelSection: {
    section: LUTHER_GALATIANS_SLUG,
    title: 'Commentary on Galatians',
    subsections: [{ title: 'Galatians 1', content: '<p>Text</p>' }],
  },
  passageKeys: ['GAL.1.1'],
}

describe('importLutherGalatiansToSupabase', () => {
  it('inserts Luther Galatians profile and passage index rows', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importLutherGalatiansToSupabase(supabase as never, parsed)

    expect(result.slug).toBe(LUTHER_GALATIANS_SLUG)
    expect(result.action).toBe('inserted')
    expect(result.subsectionCount).toBe(1)
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(1)
    expect(getInserted()?.include_in_resources_menu).toBe(true)
    expect((getIndexRows() as unknown[])?.length).toBe(result.passageKeyCount)
  })

  it('updates an existing profile', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: { id: 'profile-existing' },
    })

    const result = await importLutherGalatiansToSupabase(supabase as never, parsed)

    expect(result.action).toBe('updated')
    expect(getUpdated()?.title).toBe('Commentary on Galatians')
  })

  it('skips passage index when there are no passage keys', async () => {
    const introOnly: ParsedLutherGalatians = {
      ...parsed,
      gospelSection: {
        ...parsed.gospelSection,
        subsections: [{ title: 'Preface', content: '<p>No refs</p>' }],
      },
      passageKeys: [],
    }
    const { supabase, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importLutherGalatiansToSupabase(supabase as never, introOnly)

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws on lookup, update, insert, delete index, and index insert errors', async () => {
    const { supabase: lookupFail } = createMockCcelProfileImportSupabase({
      selectError: { message: 'db' },
    })
    await expect(importLutherGalatiansToSupabase(lookupFail as never, parsed)).rejects.toThrow(
      /Lookup lgal/
    )

    const { supabase: updateFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      updateError: { message: 'denied' },
    })
    await expect(importLutherGalatiansToSupabase(updateFail as never, parsed)).rejects.toThrow(
      /Update lgal/
    )

    const { supabase: insertFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: { message: 'dup' },
    })
    await expect(importLutherGalatiansToSupabase(insertFail as never, parsed)).rejects.toThrow(
      /Insert lgal/
    )

    const { supabase: noId } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: null,
    })
    await expect(importLutherGalatiansToSupabase(noId as never, parsed)).rejects.toThrow(
      /Insert lgal/
    )

    const { supabase: delFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(importLutherGalatiansToSupabase(delFail as never, parsed)).rejects.toThrow(
      /Clear index/
    )

    const { supabase: idxFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx' },
    })
    await expect(importLutherGalatiansToSupabase(idxFail as never, parsed)).rejects.toThrow(
      /Index lgal/
    )
  })
})
