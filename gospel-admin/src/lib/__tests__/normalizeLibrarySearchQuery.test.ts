import { normalizeLibrarySearchQuery } from '@/lib/normalizeLibrarySearchQuery'

describe('normalizeLibrarySearchQuery', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(normalizeLibrarySearchQuery('')).toBeNull()
    expect(normalizeLibrarySearchQuery('   ')).toBeNull()
  })

  it('strips unsafe ILIKE characters and trims', () => {
    expect(normalizeLibrarySearchQuery('  grace  ')).toBe('grace')
    expect(normalizeLibrarySearchQuery('david"s')).toBe('davids')
    expect(normalizeLibrarySearchQuery('a%b_c,d"e')).toBe('abcde')
  })
})
