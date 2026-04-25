import { tryParseEntireArrayAsEnglishInt } from '@/lib/memorizationEnglishNumber'

describe('memorizationEnglishNumber', () => {
  it('parses 0-19 as single words', () => {
    expect(tryParseEntireArrayAsEnglishInt(['zero'])).toBe(0)
    expect(tryParseEntireArrayAsEnglishInt(['three'])).toBe(3)
    expect(tryParseEntireArrayAsEnglishInt(['fifteen'])).toBe(15)
  })

  it('parses decades and decades plus units', () => {
    expect(tryParseEntireArrayAsEnglishInt(['twenty'])).toBe(20)
    expect(tryParseEntireArrayAsEnglishInt(['twenty', 'three'])).toBe(23)
    expect(tryParseEntireArrayAsEnglishInt(['forty', 'two'])).toBe(42)
  })

  it('parses hundreds and hundreds with a remainder', () => {
    expect(tryParseEntireArrayAsEnglishInt(['one', 'hundred', 'three'])).toBe(103)
    expect(tryParseEntireArrayAsEnglishInt(['one', 'hundred', 'and', 'three'])).toBe(103)
  })

  it('returns null for incomplete or extra words', () => {
    expect(tryParseEntireArrayAsEnglishInt(['twenty'])).toBe(20)
    expect(tryParseEntireArrayAsEnglishInt(['twenty', 'twenty'])).toBeNull()
    expect(tryParseEntireArrayAsEnglishInt([])).toBeNull()
  })
})
