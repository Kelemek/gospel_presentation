import {
  importCalvinBookToSupabase,
  importCalvinVolumeChunksToSupabase,
} from '@/lib/calvin/importCalvinBookToSupabase'
import type { ParsedCalvinBookChunk } from '@/lib/calvin/ccelCalvinHtml'
import type { Subsection } from '@/lib/types'

const bookUsfm = 'GEN'
const subNew: Subsection = { title: 'Genesis 1', content: '<p>New</p>' }
const subAppend: Subsection = { title: 'Genesis 2', content: '<p>Append</p>' }

type ProfileRow = {
  id?: string
  gospel_data?: { section: string; title: string; subsections: Subsection[] }[]
}

function createMockSupabase(handlers: {
  existing?: ProfileRow | null
  selectError?: { message: string }
  updateError?: { message: string }
  insertError?: { message: string } | null
  insertId?: string | null
  deleteIndexError?: { message: string }
  insertIndexError?: { message: string }
}) {
  let profilesSelectCount = 0
  let insertedRow: Record<string, unknown> | undefined
  let updatedRow: Record<string, unknown> | undefined
  let indexRows: unknown[] | undefined

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        profilesSelectCount += 1
        if (profilesSelectCount === 1 || handlers.existing !== undefined) {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (handlers.selectError) {
                    return { data: null, error: handlers.selectError }
                  }
                  return { data: handlers.existing ?? null, error: null }
                },
              }),
            }),
            insert: (row: Record<string, unknown>) => {
              insertedRow = row
              return {
                select: () => ({
                  single: async () => ({
                    data: handlers.insertId ? { id: handlers.insertId } : null,
                    error: handlers.insertError ?? null,
                  }),
                }),
              }
            },
            update: (row: Record<string, unknown>) => {
              updatedRow = row
              return {
                eq: async () => ({ error: handlers.updateError ?? null }),
              }
            },
          }
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: handlers.existing ?? null, error: null }),
            }),
          }),
          insert: (row: Record<string, unknown>) => {
            insertedRow = row
            return {
              select: () => ({
                single: async () => ({
                  data: handlers.insertId ? { id: handlers.insertId } : null,
                  error: handlers.insertError ?? null,
                }),
              }),
            }
          },
          update: (row: Record<string, unknown>) => {
            updatedRow = row
            return {
              eq: async () => ({ error: handlers.updateError ?? null }),
            }
          },
        }
      }
      if (table === 'spurgeon_passage_index') {
        return {
          delete: () => ({
            eq: async () => ({ error: handlers.deleteIndexError ?? null }),
          }),
          insert: async (rows: unknown[]) => {
            indexRows = rows
            return { error: handlers.insertIndexError ?? null }
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  }

  return { supabase, getInserted: () => insertedRow, getUpdated: () => updatedRow, getIndexRows: () => indexRows }
}

describe('importCalvinBookToSupabase', () => {
  it('inserts a new Calvin book profile and passage index rows', async () => {
    const { supabase, getInserted, getIndexRows } = createMockSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const result = await importCalvinBookToSupabase(supabase as never, bookUsfm, [subNew], [
      'GEN.1.1',
      'GEN.1.2',
    ])

    expect(result.slug).toBe('cvgen')
    expect(result.action).toBe('inserted')
    expect(result.subsectionCount).toBe(1)
    expect(result.passageKeyCount).toBeGreaterThanOrEqual(2)
    expect(getInserted()?.slug).toBe('cvgen')
    expect(getInserted()?.is_public).toBe(true)
    expect(getInserted()?.is_template).toBe(true)
    expect(getInserted()?.include_in_resources_menu).toBe(false)
    const rows = getIndexRows() as { passage_key: string; is_primary: boolean }[]
    expect(rows.length).toBe(result.passageKeyCount)
    expect(rows[0]?.is_primary).toBe(true)
    expect(rows.some((r) => r.passage_key === 'GEN.1.1')).toBe(true)
    expect(rows.some((r) => r.passage_key === 'GEN.1.2')).toBe(true)
  })

  it('updates an existing profile in replace mode', async () => {
    const { supabase, getUpdated } = createMockSupabase({
      existing: {
        id: 'profile-existing',
        gospel_data: [{ section: 'cvgen', title: 'Calvin on Genesis', subsections: [subNew] }],
      },
    })

    const result = await importCalvinBookToSupabase(
      supabase as never,
      bookUsfm,
      [subAppend],
      ['GEN.2.1'],
      { mergeMode: 'replace' }
    )

    expect(result.action).toBe('updated')
    expect(result.slug).toBe('cvgen')
    expect(result.subsectionCount).toBe(1)
    expect(getUpdated()?.title).toBe('Calvin on Genesis')
    expect(getUpdated()?.gospel_data).toBeDefined()
  })

  it('appends subsections when mergeMode is append and profile exists', async () => {
    const prior: Subsection = { title: 'Prior', content: '<p>Old</p>' }
    const { supabase } = createMockSupabase({
      existing: {
        id: 'profile-existing',
        gospel_data: [{ section: 'cvgen', title: 'Calvin on Genesis', subsections: [prior] }],
      },
    })

    const result = await importCalvinBookToSupabase(
      supabase as never,
      bookUsfm,
      [subAppend],
      [],
      { mergeMode: 'append' }
    )

    expect(result.action).toBe('updated')
    expect(result.subsectionCount).toBe(2)
  })

  it('skips passage index insert when finalize produces no passage keys', async () => {
    const { supabase, getIndexRows } = createMockSupabase({
      existing: null,
      insertId: 'profile-new',
    })

    const introOnly: Subsection = { title: 'Introduction', content: '<p>No refs here.</p>' }
    const result = await importCalvinBookToSupabase(supabase as never, bookUsfm, [introOnly], [])

    expect(result.passageKeyCount).toBe(0)
    expect(getIndexRows()).toBeUndefined()
  })

  it('throws when profile lookup fails', async () => {
    const { supabase } = createMockSupabase({ selectError: { message: 'db' } })
    await expect(
      importCalvinBookToSupabase(supabase as never, bookUsfm, [subNew], [])
    ).rejects.toThrow(/Lookup cvgen/)
  })

  it('throws when profile update fails', async () => {
    const { supabase } = createMockSupabase({
      existing: { id: 'p1', gospel_data: [] },
      updateError: { message: 'denied' },
    })
    await expect(
      importCalvinBookToSupabase(supabase as never, bookUsfm, [subNew], [])
    ).rejects.toThrow(/Update cvgen/)
  })

  it('throws when profile insert fails', async () => {
    const { supabase } = createMockSupabase({
      existing: null,
      insertError: { message: 'duplicate' },
    })
    await expect(
      importCalvinBookToSupabase(supabase as never, bookUsfm, [subNew], [])
    ).rejects.toThrow(/Insert cvgen/)
  })

  it('throws when profile insert returns no id', async () => {
    const { supabase } = createMockSupabase({
      existing: null,
      insertError: null,
      insertId: null,
    })
    await expect(
      importCalvinBookToSupabase(supabase as never, bookUsfm, [subNew], [])
    ).rejects.toThrow(/Insert cvgen/)
  })

  it('throws when clearing passage index fails', async () => {
    const { supabase } = createMockSupabase({
      existing: { id: 'p1' },
      deleteIndexError: { message: 'fail' },
    })
    await expect(
      importCalvinBookToSupabase(supabase as never, bookUsfm, [subNew], ['GEN.1.1'])
    ).rejects.toThrow(/Clear index/)
  })

  it('throws when passage index insert fails', async () => {
    const { supabase } = createMockSupabase({
      existing: null,
      insertId: 'p-new',
      insertIndexError: { message: 'idx fail' },
    })
    await expect(
      importCalvinBookToSupabase(supabase as never, bookUsfm, [subNew], ['GEN.1.1'])
    ).rejects.toThrow(/Index cvgen/)
  })
})

describe('importCalvinVolumeChunksToSupabase', () => {
  it('uses replace for new books and append for existing books by default', async () => {
    const chunks: ParsedCalvinBookChunk[] = [
      { bookUsfm: 'GEN', subsections: [subNew], passageKeys: ['GEN.1.1'] },
      { bookUsfm: 'EXO', subsections: [subAppend], passageKeys: ['EXO.1.1'] },
    ]

    const existingBySlug: Record<string, { id: string } | null> = {
      cvgen: null,
      cvexo: { id: 'exo-id' },
    }

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          let slugQueried = ''
          return {
            select: () => ({
              eq: (_col: string, slug: string) => {
                slugQueried = slug
                return {
                  maybeSingle: async () => ({
                    data: existingBySlug[slug] ?? null,
                    error: null,
                  }),
                }
              },
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

    const results = await importCalvinVolumeChunksToSupabase(supabase as never, chunks)

    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({
      bookUsfm: 'GEN',
      slug: 'cvgen',
      action: 'inserted',
    })
    expect(results[1]).toMatchObject({
      bookUsfm: 'EXO',
      slug: 'cvexo',
      action: 'updated',
    })
  })

  it('honors mergeMode option for all chunks', async () => {
    const chunks: ParsedCalvinBookChunk[] = [
      { bookUsfm: 'GEN', subsections: [subNew], passageKeys: [] },
    ]

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'gen-id', gospel_data: [{ section: 'cvgen', title: 'T', subsections: [subAppend] }] },
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

    const results = await importCalvinVolumeChunksToSupabase(supabase as never, chunks, {
      mergeMode: 'replace',
    })

    expect(results[0]?.subsectionCount).toBe(1)
  })
})
