import { importCcelMorneveDayToSupabase } from '@/lib/spurgeon/importCcelMorneveDayToSupabase'
import type { ParsedCcelMorneveDay } from '@/lib/spurgeon/ccelMorneveHtml'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const day: ParsedCcelMorneveDay = {
  mmdd: '0101',
  slug: 'me0101',
  title: 'January 1',
  gospelSection: {
    section: 'me0101',
    title: 'January 1',
    subsections: [{ title: 'Morning', content: '<p>AM</p>' }],
  },
  passageKeys: ['PSA.90.1'],
}

describe('importCcelMorneveDayToSupabase', () => {
  it('inserts a new M&E day profile with include_in_resources_menu false', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importCcelMorneveDayToSupabase(supabase as never, day)

    expect(result.slug).toBe('me0101')
    expect(result.action).toBe('inserted')
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(1)
    expect(getInserted()?.include_in_resources_menu).toBe(false)
    expect((getIndexRows() as unknown[])?.length).toBe(result.passageKeyCount)
  })

  it('updates an existing day profile', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: { id: 'profile-existing' },
    })

    const result = await importCcelMorneveDayToSupabase(supabase as never, day)

    expect(result.action).toBe('updated')
    expect(getUpdated()?.include_in_resources_menu).toBe(false)
  })

  it('skips passage index when there are no keys', async () => {
    const introOnly: ParsedCcelMorneveDay = {
      ...day,
      gospelSection: {
        ...day.gospelSection,
        subsections: [{ title: 'Note', content: '<p>No refs</p>' }],
      },
      passageKeys: [],
    }
    const { supabase, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importCcelMorneveDayToSupabase(supabase as never, introOnly)

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws on lookup, update, insert, delete index, and index insert errors', async () => {
    const { supabase: lookupFail } = createMockCcelProfileImportSupabase({
      selectError: { message: 'db' },
    })
    await expect(importCcelMorneveDayToSupabase(lookupFail as never, day)).rejects.toThrow(
      /Lookup me0101/
    )

    const { supabase: updateFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      updateError: { message: 'denied' },
    })
    await expect(importCcelMorneveDayToSupabase(updateFail as never, day)).rejects.toThrow(
      /Update me0101/
    )

    const { supabase: insertFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: { message: 'dup' },
    })
    await expect(importCcelMorneveDayToSupabase(insertFail as never, day)).rejects.toThrow(
      /Insert me0101/
    )

    const { supabase: noId } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: null,
    })
    await expect(importCcelMorneveDayToSupabase(noId as never, day)).rejects.toThrow(
      /Insert me0101/
    )

    const { supabase: delFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(importCcelMorneveDayToSupabase(delFail as never, day)).rejects.toThrow(
      /Clear index/
    )

    const { supabase: idxFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx' },
    })
    await expect(importCcelMorneveDayToSupabase(idxFail as never, day)).rejects.toThrow(
      /Index me0101/
    )
  })
})
