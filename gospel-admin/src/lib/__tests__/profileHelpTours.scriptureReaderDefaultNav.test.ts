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
  scriptureReaderTourNavigation,
  tryStartScriptureReaderTourAfterNavigation,
  runScriptureModalFeatureTour,
} from '@/lib/profileHelpTours'

const RESUME_KEY = 'gospel-scripture-reader-tour-resume-v1'

describe('scripture reader tour — default profile navigation', () => {
  let assignSpy: jest.SpyInstance
  const initialPath = `${window.location.pathname}${window.location.search}`

  beforeEach(() => {
    sessionStorage.clear()
    ;(driver as jest.Mock).mockClear()
    assignSpy = jest.spyOn(scriptureReaderTourNavigation, 'assign').mockImplementation(() => {})
    global.requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    }
  })

  afterEach(() => {
    assignSpy.mockRestore()
    window.history.pushState({}, '', initialPath)
  })

  it('stores resume payload and assigns /default when not on default profile', () => {
    window.history.pushState({}, '', '/custom-slug')

    runScriptureModalFeatureTour()

    expect(assignSpy).toHaveBeenCalledWith('/default')
    const raw = sessionStorage.getItem(RESUME_KEY)
    expect(raw).toBeTruthy()
    const payload = JSON.parse(raw!) as { v: number; captiveForTour: boolean; continueFullWalkthroughAt?: number }
    expect(payload.v).toBe(1)
    expect(payload.captiveForTour).toBe(false)
    expect(payload.continueFullWalkthroughAt).toBeUndefined()
    expect(driver).not.toHaveBeenCalled()
  })

  it('stores continueFullWalkthroughAt when captive (full walkthrough)', () => {
    window.history.pushState({}, '', '/other')

    runScriptureModalFeatureTour({ captive: true })

    expect(assignSpy).toHaveBeenCalledWith('/default')
    const payload = JSON.parse(sessionStorage.getItem(RESUME_KEY)!) as {
      continueFullWalkthroughAt?: number
      captiveForTour: boolean
    }
    expect(payload.captiveForTour).toBe(true)
    expect(typeof payload.continueFullWalkthroughAt).toBe('number')
  })

  it('starts driver on default when already on default path', () => {
    window.history.pushState({}, '', '/default')

    runScriptureModalFeatureTour()

    expect(assignSpy).not.toHaveBeenCalled()
    expect(driver).toHaveBeenCalled()
  })

  it('tryStartScriptureReaderTourAfterNavigation consumes storage and starts tour on default slug', () => {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ v: 1, captiveForTour: false }))

    tryStartScriptureReaderTourAfterNavigation('default')

    expect(sessionStorage.getItem(RESUME_KEY)).toBeNull()
    expect(driver).toHaveBeenCalled()
  })

  it('tryStartScriptureReaderTourAfterNavigation no-ops for non-default slug', () => {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify({ v: 1, captiveForTour: false }))

    tryStartScriptureReaderTourAfterNavigation('other-slug')

    expect(sessionStorage.getItem(RESUME_KEY)).toBeTruthy()
    expect(driver).not.toHaveBeenCalled()
  })
})
