import {
  isValidExternalResourceUrl,
  normalizeExternalResourceUrl,
} from '../externalResourceLink'

describe('externalResourceLink', () => {
  describe('normalizeExternalResourceUrl', () => {
    it('returns null for empty input', () => {
      expect(normalizeExternalResourceUrl('')).toBeNull()
      expect(normalizeExternalResourceUrl('   ')).toBeNull()
    })

    it('prepends https when scheme is omitted', () => {
      expect(normalizeExternalResourceUrl('biblicalcounseling.com/topic')).toBe(
        'https://biblicalcounseling.com/topic'
      )
    })

    it('accepts http and https URLs', () => {
      expect(normalizeExternalResourceUrl('https://example.com/a')).toBe('https://example.com/a')
      expect(normalizeExternalResourceUrl('http://example.com/a')).toBe('http://example.com/a')
    })

    it('rejects non-http schemes', () => {
      expect(normalizeExternalResourceUrl('javascript:alert(1)')).toBeNull()
      expect(normalizeExternalResourceUrl('ftp://files.example.com/x')).toBeNull()
    })

    it('rejects invalid URLs', () => {
      expect(normalizeExternalResourceUrl('not a url!!!')).toBeNull()
    })
  })

  describe('isValidExternalResourceUrl', () => {
    it('mirrors normalize success', () => {
      expect(isValidExternalResourceUrl('https://acbc.org')).toBe(true)
      expect(isValidExternalResourceUrl('ftp://x')).toBe(false)
    })
  })
})
