/**
 * @jest-environment jsdom
 */

jest.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}))

import {
  SCRIPTURE_READER_TOUR_DEFAULT_SLUG,
  buildBibleTranslationTourPopoverDescription,
  getPresentationSlugFromPathname,
  parseMarriageSeminarTourResumeStorageValue,
  scriptureReaderTourNavigation,
  setProfileHelpTourClientNavigate,
} from '@/lib/profileHelpTours/index'

describe('profileHelpTours pure helpers', () => {
  describe('parseMarriageSeminarTourResumeStorageValue', () => {
    it('returns null for empty input', () => {
      expect(parseMarriageSeminarTourResumeStorageValue(null)).toBeNull()
      expect(parseMarriageSeminarTourResumeStorageValue('')).toBeNull()
    })

    it('parses v2 JSON payloads', () => {
      expect(
        parseMarriageSeminarTourResumeStorageValue(
          JSON.stringify({ v: 2, captive: true, fullWalkthroughChain: false })
        )
      ).toEqual({ v: 2, captive: true, fullWalkthroughChain: false })
    })

    it('maps legacy string tokens', () => {
      expect(parseMarriageSeminarTourResumeStorageValue('pending')).toEqual({
        v: 2,
        captive: false,
        fullWalkthroughChain: false,
      })
      expect(parseMarriageSeminarTourResumeStorageValue('full-walkthrough')).toEqual({
        v: 2,
        captive: true,
        fullWalkthroughChain: true,
      })
    })

    it('returns null for invalid JSON and unknown strings', () => {
      expect(parseMarriageSeminarTourResumeStorageValue('not-json')).toBeNull()
      expect(
        parseMarriageSeminarTourResumeStorageValue(JSON.stringify({ v: 1 }))
      ).toBeNull()
    })
  })

  describe('getPresentationSlugFromPathname', () => {
    it('returns default slug for empty pathname', () => {
      expect(getPresentationSlugFromPathname('')).toBe(SCRIPTURE_READER_TOUR_DEFAULT_SLUG)
    })

    it('extracts first segment and strips query/hash', () => {
      expect(getPresentationSlugFromPathname('/my-profile/section')).toBe('my-profile')
      expect(getPresentationSlugFromPathname('/foo?x=1#hash')).toBe('foo')
      expect(getPresentationSlugFromPathname('/trailing/')).toBe('trailing')
    })
  })

  describe('scriptureReaderTourNavigation', () => {
    it('exposes assign for tour navigation', () => {
      setProfileHelpTourClientNavigate(null)
      const assignSpy = jest.spyOn(scriptureReaderTourNavigation, 'assign').mockImplementation(() => {})
      try {
        scriptureReaderTourNavigation.assign('/default')
        expect(assignSpy).toHaveBeenCalledWith('/default')
      } finally {
        assignSpy.mockRestore()
      }
    })
  })

  describe('buildBibleTranslationTourPopoverDescription', () => {
    it('lists enabled translation names and escapes HTML', () => {
      const html = buildBibleTranslationTourPopoverDescription([
        { translation_name: 'ESV' },
        { translation_name: '  ' },
        { translation_name: 'KJV &amp; Co' },
      ])
      expect(html).toContain('ESV')
      expect(html).toContain('KJV &amp;amp; Co')
      expect(html).toContain('<ul')
    })

    it('falls back to ESV when list is empty', () => {
      const html = buildBibleTranslationTourPopoverDescription([])
      expect(html).toContain('ESV (English Standard Version)')
    })
  })
})
