import { buildBiblePassageReference } from '@/lib/buildBiblePassageReference'

describe('buildBiblePassageReference', () => {
  it('returns chapter-only when verseStart is null', () => {
    expect(buildBiblePassageReference('GEN', 'Genesis', 1, null, null)).toBe('Genesis 1')
  })

  it('returns single verse', () => {
    expect(buildBiblePassageReference('JHN', 'John', 3, 16, null)).toBe('John 3:16')
  })

  it('returns verse range', () => {
    expect(buildBiblePassageReference('JHN', 'John', 3, 16, 18)).toBe('John 3:16-18')
  })
})
