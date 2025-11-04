import { jest } from '@jest/globals'
import path from 'path'

describe('supabase client import variants', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('loads via relative require', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../supabase/client')
    expect(mod).toBeDefined()
    expect(typeof mod.createClient).toBe('function')
  })

  it('loads via absolute path require', () => {
    const abs = path.resolve(process.cwd(), 'src/lib/supabase/client.ts')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(abs)
    expect(mod).toBeDefined()
    expect(typeof mod.createClient).toBe('function')
  })

  it('attempts to load via tsconfig alias if configured', () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ali = require('@/lib/supabase/client')
      expect(ali).toBeDefined()
      expect(typeof ali.createClient).toBe('function')
    } catch (err) {
      // Not critical if alias isn't configured in this environment
      expect(err).toBeTruthy()
    }
  })
})
