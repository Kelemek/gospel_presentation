jest.unmock('@/lib/supabase/client')
jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => {
    const originalFrom = (table: string) => ({ fromTable: table })
    return { from: originalFrom }
  }),
}))

import { createClient, getSupabaseClient } from '../supabase/client'

describe('supabase client coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('createClient returns a client with from()', () => {
    const client = createClient()
    expect(client).toBeDefined()
    expect(client.from).toBeDefined()
    const result = client.from('test_table')
    expect(result).toHaveProperty('fromTable', 'test_table')
  })

  it('getSupabaseClient returns singleton', () => {
    const a = getSupabaseClient()
    const b = getSupabaseClient()
    expect(a).toBe(b)
  })
})
