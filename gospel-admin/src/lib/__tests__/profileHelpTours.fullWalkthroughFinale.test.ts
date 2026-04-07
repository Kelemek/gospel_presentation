/**
 * @jest-environment jsdom
 */

jest.mock('driver.js', () => ({
  driver: jest.fn(() => ({
    drive: jest.fn(),
    destroy: jest.fn(),
  })),
}))

import { driver } from 'driver.js'
import {
  getPresentationSlugFromPathname,
  parseMarriageSeminarTourResumeStorageValue,
  runFullWalkthroughThankYouFinale,
  scriptureReaderTourNavigation,
} from '@/lib/profileHelpTours'

describe('full walkthrough finale', () => {
  const KEY = 'gospel-full-walkthrough-start-slug-v1'

  beforeEach(() => {
    sessionStorage.clear()
    ;(driver as jest.Mock).mockClear()
    jest.spyOn(scriptureReaderTourNavigation, 'assign').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getPresentationSlugFromPathname', () => {
    it('returns first path segment', () => {
      expect(getPresentationSlugFromPathname('/my-profile')).toBe('my-profile')
      expect(getPresentationSlugFromPathname('/default')).toBe('default')
    })

    it('strips trailing slash and ignores query', () => {
      expect(getPresentationSlugFromPathname('/foo/')).toBe('foo')
      expect(getPresentationSlugFromPathname('/bar?x=1')).toBe('bar')
    })

    it('falls back to default for empty or root', () => {
      expect(getPresentationSlugFromPathname('')).toBe('default')
      expect(getPresentationSlugFromPathname('/')).toBe('default')
    })
  })

  function finishThankYouDriverAsCompleted(): void {
    const cfg = (driver as jest.Mock).mock.calls[0]?.[0] as { onDestroyed?: () => void }
    cfg?.onDestroyed?.()
  }

  it('runFullWalkthroughThankYouFinale navigates to stored slug and clears storage', () => {
    sessionStorage.setItem(KEY, JSON.stringify({ v: 1, slug: 'started-here' }))

    runFullWalkthroughThankYouFinale()
    finishThankYouDriverAsCompleted()

    expect(scriptureReaderTourNavigation.assign).toHaveBeenCalledWith('/started-here')
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })

  it('runFullWalkthroughThankYouFinale uses /default when storage missing', () => {
    runFullWalkthroughThankYouFinale()
    finishThankYouDriverAsCompleted()

    expect(scriptureReaderTourNavigation.assign).toHaveBeenCalledWith('/default')
  })

  describe('parseMarriageSeminarTourResumeStorageValue', () => {
    it('parses v2 JSON', () => {
      expect(
        parseMarriageSeminarTourResumeStorageValue(
          JSON.stringify({ v: 2, captive: true, fullWalkthroughChain: true })
        )
      ).toEqual({ v: 2, captive: true, fullWalkthroughChain: true })
      expect(
        parseMarriageSeminarTourResumeStorageValue(
          JSON.stringify({ v: 2, captive: false, fullWalkthroughChain: false })
        )
      ).toEqual({ v: 2, captive: false, fullWalkthroughChain: false })
    })

    it('maps legacy strings', () => {
      expect(parseMarriageSeminarTourResumeStorageValue('full-walkthrough')).toEqual({
        v: 2,
        captive: true,
        fullWalkthroughChain: true,
      })
      expect(parseMarriageSeminarTourResumeStorageValue('pending')).toEqual({
        v: 2,
        captive: false,
        fullWalkthroughChain: false,
      })
    })

    it('returns null for invalid values', () => {
      expect(parseMarriageSeminarTourResumeStorageValue(null)).toBeNull()
      expect(parseMarriageSeminarTourResumeStorageValue('')).toBeNull()
      expect(parseMarriageSeminarTourResumeStorageValue('{}')).toBeNull()
    })
  })
})
