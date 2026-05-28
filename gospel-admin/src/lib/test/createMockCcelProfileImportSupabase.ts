/** Shared Supabase mock for CCEL profile import unit tests. */
export type CcelImportMockHandlers = {
  existing?: { id?: string } | null
  selectError?: { message: string }
  updateError?: { message: string }
  insertError?: { message: string } | null
  insertId?: string | null
  deleteIndexError?: { message: string }
  insertIndexError?: { message: string }
}

export function createMockCcelProfileImportSupabase(handlers: CcelImportMockHandlers) {
  let insertedRow: Record<string, unknown> | undefined
  let updatedRow: Record<string, unknown> | undefined
  let indexRows: unknown[] | undefined

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
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

  return {
    supabase,
    getInserted: () => insertedRow,
    getUpdated: () => updatedRow,
    getIndexRows: () => indexRows,
  }
}
