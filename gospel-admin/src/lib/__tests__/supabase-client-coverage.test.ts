import { createClient } from '../supabase/client'

describe('supabase client coverage', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })

  it('createClient returns a new client', () => {
    const client = createClient()
    expect(client).toBeDefined()
  })
})
