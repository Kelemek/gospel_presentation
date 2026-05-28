import {
  importHenryBookToSupabase,
  importHenryVolumeChunksToSupabase,
} from '@/lib/henry/importHenryBookToSupabase'
import type { ParsedHenryBookChunk } from '@/lib/henry/ccelHenryHtml'
import type { Subsection } from '@/lib/types'
import { createMockCcelProfileImportSupabase } from '@/lib/test/createMockCcelProfileImportSupabase'

const bookUsfm = 'GEN'
const subNew: Subsection = { title: 'Genesis 1', content: '<p>New</p>' }
const subAppend: Subsection = { title: 'Genesis 2', content: '<p>Append</p>' }

describe('importHenryBookToSupabase', () => {
  it('inserts a new Henry book profile with include_in_resources_menu false', async () => {
    const { supabase, getInserted, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importHenryBookToSupabase(supabase as never, bookUsfm, [subNew], [
      'GEN.1.1',
    ])

    expect(result.slug).toBe('mhgen')
    expect(result.action).toBe('inserted')
    expect(result.subsectionCount).toBe(1)
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(1)
    expect(getInserted()?.include_in_resources_menu).toBe(false)
    expect((getIndexRows() as unknown[])?.length).toBe(result.passageKeyCount)
  })

  it('updates an existing profile in replace mode', async () => {
    const { supabase, getUpdated } = createMockCcelProfileImportSupabase({
      existing: {
        id: 'profile-existing',
        gospel_data: [{ section: 'mhgen', title: 'Matthew Henry on Genesis', subsections: [subNew] }],
      },
    })

    const result = await importHenryBookToSupabase(
      supabase as never,
      bookUsfm,
      [subAppend],
      ['GEN.2.1'],
      { mergeMode: 'replace' }
    )

    expect(result.action).toBe('updated')
    expect(result.subsectionCount).toBe(1)
    expect(getUpdated()?.title).toBe('Matthew Henry on Genesis')
  })

  it('appends subsections when mergeMode is append and profile exists', async () => {
    const prior: Subsection = { title: 'Prior', content: '<p>Old</p>' }
    const { supabase } = createMockCcelProfileImportSupabase({
      existing: {
        id: 'profile-existing',
        gospel_data: [{ section: 'mhgen', title: 'Matthew Henry on Genesis', subsections: [prior] }],
      },
    })

    const result = await importHenryBookToSupabase(
      supabase as never,
      bookUsfm,
      [subAppend],
      [],
      { mergeMode: 'append' }
    )

    expect(result.action).toBe('updated')
    expect(result.subsectionCount).toBe(2)
  })

  it('skips passage index when finalize produces no passage keys', async () => {
    const { supabase, getIndexRows } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const introOnly: Subsection = { title: 'Introduction', content: '<p>No refs</p>' }
    const result = await importHenryBookToSupabase(supabase as never, bookUsfm, [introOnly], [])

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws on lookup, update, insert, delete index, and index insert errors', async () => {
    const { supabase: lookupFail } = createMockCcelProfileImportSupabase({
      selectError: { message: 'db' },
    })
    await expect(importHenryBookToSupabase(lookupFail as never, bookUsfm, [subNew], [])).rejects.toThrow(
      /Lookup mhgen/
    )

    const { supabase: updateFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      updateError: { message: 'denied' },
    })
    await expect(importHenryBookToSupabase(updateFail as never, bookUsfm, [subNew], [])).rejects.toThrow(
      /Update mhgen/
    )

    const { supabase: insertFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertError: { message: 'dup' },
    })
    await expect(importHenryBookToSupabase(insertFail as never, bookUsfm, [subNew], [])).rejects.toThrow(
      /Insert mhgen/
    )

    const { supabase: noId } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: null,
    })
    await expect(importHenryBookToSupabase(noId as never, bookUsfm, [subNew], [])).rejects.toThrow(
      /Insert mhgen/
    )

    const { supabase: delFail } = createMockCcelProfileImportSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(
      importHenryBookToSupabase(delFail as never, bookUsfm, [subNew], ['GEN.1.1'])
    ).rejects.toThrow(/Clear index/)

    const { supabase: idxFail } = createMockCcelProfileImportSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx' },
    })
    await expect(
      importHenryBookToSupabase(idxFail as never, bookUsfm, [subNew], ['GEN.1.1'])
    ).rejects.toThrow(/Index mhgen/)
  })
})

describe('importHenryVolumeChunksToSupabase', () => {
  it('uses replace for new books and append for existing books by default', async () => {
    const chunks: ParsedHenryBookChunk[] = [
      { bookUsfm: 'GEN', subsections: [subNew], passageKeys: ['GEN.1.1'] },
      { bookUsfm: 'EXO', subsections: [subAppend], passageKeys: ['EXO.1.1'] },
    ]

    const existingBySlug: Record<string, { id: string } | null> = {
      mhgen: null,
      mhexo: { id: 'exo-id' },
    }

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: (_col: string, slug: string) => ({
                maybeSingle: async () => ({
                  data:
                    slug === 'mhexo'
                      ? {
                          id: 'exo-id',
                          gospel_data: [
                            { section: 'mhexo', title: 'T', subsections: [subAppend] },
                          ],
                        }
                      : existingBySlug[slug] ?? null,
                  error: null,
                }),
              }),
            }),
            insert: (row: Record<string, unknown>) => ({
              select: () => ({
                single: async () => ({
                  data: { id: `new-${String(row.slug)}` },
                  error: null,
                }),
              }),
            }),
            update: () => ({
              eq: async () => ({ error: null }),
            }),
          }
        }
        if (table === 'spurgeon_passage_index') {
          return {
            delete: () => ({ eq: async () => ({ error: null }) }),
            insert: async () => ({ error: null }),
          }
        }
        throw new Error(table)
      }),
    }

    const results = await importHenryVolumeChunksToSupabase(supabase as never, chunks)

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ bookUsfm: 'GEN', slug: 'mhgen', action: 'inserted' })
    expect(results[1]).toMatchObject({ bookUsfm: 'EXO', slug: 'mhexo', action: 'updated' })
  })

  it('honors mergeMode option for all chunks', async () => {
    const chunks: ParsedHenryBookChunk[] = [
      { bookUsfm: 'GEN', subsections: [subNew], passageKeys: [] },
    ]

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'gen-id',
                    gospel_data: [
                      { section: 'mhgen', title: 'T', subsections: [subAppend] },
                    ],
                  },
                  error: null,
                }),
              }),
            }),
            update: () => ({ eq: async () => ({ error: null }) }),
            insert: () => ({
              select: () => ({ single: async () => ({ data: { id: 'x' }, error: null }) }),
            }),
          }
        }
        if (table === 'spurgeon_passage_index') {
          return {
            delete: () => ({ eq: async () => ({ error: null }) }),
            insert: async () => ({ error: null }),
          }
        }
        throw new Error(table)
      }),
    }

    const results = await importHenryVolumeChunksToSupabase(supabase as never, chunks, {
      mergeMode: 'replace',
    })

    expect(results[0]?.subsectionCount).toBe(1)
  })
})
