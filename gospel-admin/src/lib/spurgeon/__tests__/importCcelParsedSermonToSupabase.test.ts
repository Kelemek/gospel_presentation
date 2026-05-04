import { importCcelParsedSermonToSupabase } from '@/lib/spurgeon/importCcelParsedSermonToSupabase'
import type { ParsedCcelSermonDiv1 } from '@/lib/spurgeon/ccelSermonHtml'

const minimalSermon: ParsedCcelSermonDiv1 = {
  sermonTitle: 'Sermon 1. Example',
  divInner: '',
  sermonNo: 1,
  slug: 'sg00001',
  gospelSection: { section: 'sg00001', title: 'Sermon 1. Example', subsections: [] },
  passageKeys: [],
}

describe('importCcelParsedSermonToSupabase', () => {
  it('inserts new profile with is_public true', async () => {
    let inserted: Record<string, unknown> | undefined
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            insert: (row: Record<string, unknown>) => {
              inserted = row
              return {
                select: () => ({
                  single: async () => ({ data: { id: 'new-profile-id' }, error: null }),
                }),
              }
            },
          }
        }
        if (table === 'spurgeon_passage_index') {
          return {
            delete: () => ({
              eq: async () => ({ error: null }),
            }),
            insert: async () => ({ error: null }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    await importCcelParsedSermonToSupabase(supabase as never, minimalSermon)
    expect(inserted?.is_public).toBe(true)
    expect(inserted?.is_template).toBe(true)
  })

  it('updates existing profile with is_public true', async () => {
    let updated: Record<string, unknown> | undefined
    let profilesFromCount = 0
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          profilesFromCount++
          if (profilesFromCount === 1) {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'existing-id', is_public: false },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {
            update: (row: Record<string, unknown>) => {
              updated = row
              return {
                eq: async () => ({ error: null }),
              }
            },
          }
        }
        if (table === 'spurgeon_passage_index') {
          return {
            delete: () => ({
              eq: async () => ({ error: null }),
            }),
            insert: async () => ({ error: null }),
          }
        }
        throw new Error(`unexpected table ${table}`)
      }),
    }

    await importCcelParsedSermonToSupabase(supabase as never, minimalSermon)
    expect(updated?.is_public).toBe(true)
  })
})
