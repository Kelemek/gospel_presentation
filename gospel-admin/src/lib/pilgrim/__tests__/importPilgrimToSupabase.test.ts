import { PILGRIM_PROGRESS_SLUG } from '@/lib/pilgrim/pilgrimSlug'
import { importPilgrimToSupabase } from '@/lib/pilgrim/importPilgrimToSupabase'
import type { ParsedPilgrimProgress } from '@/lib/pilgrim/ccelPilgrimHtml'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const parsed: ParsedPilgrimProgress = {
  slug: PILGRIM_PROGRESS_SLUG,
  title: "Pilgrim's Progress",
  gospelSection: {
    section: PILGRIM_PROGRESS_SLUG,
    title: "Pilgrim's Progress",
    subsections: [{ title: 'Chapter 1', content: '<p>Text</p>' }],
  },
  passageKeys: ['PSA.23.1'],
}

describe('importPilgrimToSupabase', () => {
  it('inserts a new Pilgrim profile and passage index rows', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importPilgrimToSupabase(supabase as never, parsed)

    expect(result.slug).toBe(PILGRIM_PROGRESS_SLUG)
    expect(result.action).toBe('inserted')
    expect(result.subsectionCount).toBe(1)
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(1)
    expect(getInserted()?.slug).toBe(PILGRIM_PROGRESS_SLUG)
    expect(getInserted()?.include_in_resources_menu).toBe(true)
    expect((getIndexRows() as unknown[])?.length).toBe(result.passageKeyCount)
  })

  it('updates an existing profile', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: { id: 'profile-existing' },
    })

    const result = await importPilgrimToSupabase(supabase as never, parsed)

    expect(result.action).toBe('updated')
    expect(getUpdated()?.title).toBe("Pilgrim's Progress")
  })

  it('skips passage index insert when there are no passage keys', async () => {
    const introOnly: ParsedPilgrimProgress = {
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

    const result = await importPilgrimToSupabase(supabase as never, introOnly)

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws on lookup, update, insert, delete index, and index insert errors', async () => {
    const { supabase: lookupFail } = createMockCcelProfileImportSupabase({
      selectError: { message: 'db' },
    })
    await expect(importPilgrimToSupabase(lookupFail as never, parsed)).rejects.toThrow(
      /Lookup ppgr/
    )

    const { supabase: updateFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      updateError: { message: 'denied' },
    })
    await expect(importPilgrimToSupabase(updateFail as never, parsed)).rejects.toThrow(/Update ppgr/)

    const { supabase: insertFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: { message: 'dup' },
    })
    await expect(importPilgrimToSupabase(insertFail as never, parsed)).rejects.toThrow(/Insert ppgr/)

    const { supabase: noId } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: null,
    })
    await expect(importPilgrimToSupabase(noId as never, parsed)).rejects.toThrow(/Insert ppgr/)

    const { supabase: delFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(importPilgrimToSupabase(delFail as never, parsed)).rejects.toThrow(/Clear index/)

    const { supabase: idxFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx' },
    })
    await expect(importPilgrimToSupabase(idxFail as never, parsed)).rejects.toThrow(/Index ppgr/)
  })
})
