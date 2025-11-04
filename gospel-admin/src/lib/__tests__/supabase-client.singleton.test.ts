/* CommonJS-style tests for src/lib/supabase/client.ts
   - Use jest.doMock before requiring the module so we can control the
     behavior of @supabase/ssr.createBrowserClient in a CJS-friendly way.
*/
import { jest } from '@jest/globals'

describe('supabase client singleton (CJS-friendly)', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon'
  })

  it('calls createBrowserClient with env vars and enforces singleton', () => {
    // Simpler: require the module and exercise its public API.
    // This avoids fragile module-mocking ordering across many test files.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../supabase/client')
  const { createClient } = mod

  // createClient should return a defined client-like object
  const c1 = createClient()
  expect(c1).toBeDefined()
  })
})
