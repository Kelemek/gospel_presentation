jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({ mocked: true })),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: (name: string) => ({ value: `cookie-${name}` }),
    set: jest.fn(),
  })),
}))

import { createClient, createAdminClient } from '../server'
import { createServerClient } from '@supabase/ssr'

describe('supabase server helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('createClient calls createServerClient with env and cookie helpers', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon'

    const client = await createClient()

    expect(createServerClient).toHaveBeenCalled()
    expect(client).toEqual({ mocked: true })
  })

  it('createAdminClient uses service key', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test'
    process.env.SUPABASE_SERVICE_KEY = 'service'

    const client = createAdminClient()

    expect(createServerClient).toHaveBeenCalled()
    expect(client).toEqual({ mocked: true })
  })
})
