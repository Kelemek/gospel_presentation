import { importCcelParsedEdwardsToSupabase } from '@/lib/edwards/importCcelParsedEdwardsToSupabase'
import type { ParsedEdwardsSermonDiv1 } from '@/lib/edwards/ccelEdwardsHtml'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const sermon: ParsedEdwardsSermonDiv1 = {
  sermonTitle: 'God Glorified in Man’s Dependence',
  divInner: '',
  sermonNo: 1,
  slug: 'je01',
  gospelSection: {
    section: 'je01',
    title: 'God Glorified in Man’s Dependence',
    subsections: [{ title: '1 Corinthians 1', content: '<p>Text</p>' }],
  },
  passageKeys: ['1CO.1.29'],
}

describe('importCcelParsedEdwardsToSupabase', () => {
  it('inserts Edwards sermon profile with sermon_no on index rows', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importCcelParsedEdwardsToSupabase(supabase as never, sermon)

    expect(result.slug).toBe('je01')
    expect(result.action).toBe('inserted')
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(1)
    expect(getInserted()?.include_in_resources_menu).toBe(false)
    const rows = getIndexRows() as { sermon_no: number; is_primary: boolean }[]
    expect(rows[0]?.sermon_no).toBe(1)
    expect(rows[0]?.is_primary).toBe(true)
  })

  it('updates an existing sermon profile', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: { id: 'profile-existing', is_public: false },
    })

    const result = await importCcelParsedEdwardsToSupabase(supabase as never, sermon)

    expect(result.action).toBe('updated')
    expect(getUpdated()?.title).toBe(sermon.sermonTitle)
    expect(getUpdated()?.is_public).toBe(true)
  })

  it('skips passage index when there are no passage keys', async () => {
    const introOnly: ParsedEdwardsSermonDiv1 = {
      ...sermon,
      gospelSection: {
        ...sermon.gospelSection,
        subsections: [{ title: 'Note', content: '<p>No refs</p>' }],
      },
      passageKeys: [],
    }
    const { supabase, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importCcelParsedEdwardsToSupabase(supabase as never, introOnly)

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws on lookup, update, insert, delete index, and index insert errors', async () => {
    const { supabase: lookupFail } = createMockCcelProfileImportSupabase({
      selectError: { message: 'db' },
    })
    await expect(importCcelParsedEdwardsToSupabase(lookupFail as never, sermon)).rejects.toThrow(
      /Lookup je01/
    )

    const { supabase: updateFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      updateError: { message: 'denied' },
    })
    await expect(importCcelParsedEdwardsToSupabase(updateFail as never, sermon)).rejects.toThrow(
      /Update je01/
    )

    const { supabase: insertFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: { message: 'dup' },
    })
    await expect(importCcelParsedEdwardsToSupabase(insertFail as never, sermon)).rejects.toThrow(
      /Insert je01/
    )

    const { supabase: noId } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: null,
    })
    await expect(importCcelParsedEdwardsToSupabase(noId as never, sermon)).rejects.toThrow(
      /Insert je01/
    )

    const { supabase: delFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(importCcelParsedEdwardsToSupabase(delFail as never, sermon)).rejects.toThrow(
      /Clear index/
    )

    const { supabase: idxFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx' },
    })
    await expect(importCcelParsedEdwardsToSupabase(idxFail as never, sermon)).rejects.toThrow(
      /Index je01/
    )
  })
})
