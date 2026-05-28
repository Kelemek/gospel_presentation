import { importWatsonBookToSupabase } from '@/lib/watson/importWatsonBookToSupabase'
import type { ParsedWatsonBook } from '@/lib/watson/ccelWatsonHtml'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const parsed: ParsedWatsonBook = {
  slug: 'wt01',
  title: 'Body of Divinity',
  gospelSection: {
    section: 'wt01',
    title: 'Body of Divinity',
    subsections: [{ title: 'Genesis 1', content: '<p>Text</p>' }],
  },
  passageKeys: ['GEN.1.1', 'GEN.1.2'],
}

describe('importWatsonBookToSupabase', () => {
  it('inserts a new Watson book profile and passage index rows', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importWatsonBookToSupabase(supabase as never, parsed)

    expect(result.slug).toBe('wt01')
    expect(result.action).toBe('inserted')
    expect(result.subsectionCount).toBe(1)
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(2)
    expect(getInserted()?.slug).toBe('wt01')
    expect(getInserted()?.include_in_resources_menu).toBe(true)
    const rows = getIndexRows() as { passage_key: string; is_primary: boolean }[]
    expect(rows.length).toBe(result.passageKeyCount)
    expect(rows[0]?.is_primary).toBe(true)
  })

  it('updates an existing profile', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: { id: 'profile-existing' },
    })

    const result = await importWatsonBookToSupabase(supabase as never, parsed)

    expect(result.action).toBe('updated')
    expect(getUpdated()?.title).toBe('Body of Divinity')
  })

  it('skips passage index insert when finalize produces no passage keys', async () => {
    const introOnly: ParsedWatsonBook = {
      ...parsed,
      gospelSection: {
        ...parsed.gospelSection,
        subsections: [{ title: 'Introduction', content: '<p>No refs</p>' }],
      },
      passageKeys: [],
    }
    const { supabase, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importWatsonBookToSupabase(supabase as never, introOnly)

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws when profile lookup fails', async () => {
    const { supabase } = createMockCcelProfileImportSupabase({ selectError: { message: 'db' } })
    await expect(importWatsonBookToSupabase(supabase as never, parsed)).rejects.toThrow(/Lookup wt01/)
  })

  it('throws when profile update fails', async () => {
    const { supabase } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      updateError: { message: 'denied' },
    })
    await expect(importWatsonBookToSupabase(supabase as never, parsed)).rejects.toThrow(/Update wt01/)
  })

  it('throws when profile insert fails', async () => {
    const { supabase } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: { message: 'duplicate' },
    })
    await expect(importWatsonBookToSupabase(supabase as never, parsed)).rejects.toThrow(/Insert wt01/)
  })

  it('throws when profile insert returns no id', async () => {
    const { supabase } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: null,
      insertId: null,
    })
    await expect(importWatsonBookToSupabase(supabase as never, parsed)).rejects.toThrow(/Insert wt01/)
  })

  it('throws when clearing passage index fails', async () => {
    const { supabase } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(importWatsonBookToSupabase(supabase as never, parsed)).rejects.toThrow(/Clear index/)
  })

  it('throws when passage index insert fails', async () => {
    const { supabase } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx fail' },
    })
    await expect(importWatsonBookToSupabase(supabase as never, parsed)).rejects.toThrow(/Index wt01/)
  })
})
