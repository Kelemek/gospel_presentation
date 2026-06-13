/** @jest-environment jsdom */

import type { ProfileReadingResumeV1 } from '../profileReadingResumeStorage'
import {
  evaluateReadingResumeFingerprint,
  readingResumeForScrollTopGuard,
  runReadingResumeRestoreWithFingerprintRetry,
} from '../profileReadingResumeRestore'

jest.mock('../profileReadingPosition', () => {
  const actual = jest.requireActual('../profileReadingPosition')
  return {
    ...actual,
    resolveReadingScope: jest.fn(),
    isReadingPositionFingerprintValid: jest.fn(),
    listenTextOptionsForProfileSlug: jest.fn(() => ({})),
  }
})

import {
  isReadingPositionFingerprintValid,
  resolveReadingScope,
} from '../profileReadingPosition'

const resume: ProfileReadingResumeV1 = {
  v: 1,
  anchorId: 'section-1-0',
  plainOffset: 40,
  fingerprint: 'fp-test',
}

describe('readingResumeForScrollTopGuard', () => {
  it('returns storage when present', () => {
    expect(
      readingResumeForScrollTopGuard('p2', resume, 'p1', { ...resume, plainOffset: 99 })
    ).toEqual(resume)
  })

  it('uses in-memory fallback only for the same slug', () => {
    const memory = { ...resume, plainOffset: 99 }
    expect(readingResumeForScrollTopGuard('p1', null, 'p1', memory)).toEqual(memory)
    expect(readingResumeForScrollTopGuard('p2', null, 'p1', memory)).toBeNull()
  })
})

describe('profileReadingResumeRestore', () => {
  beforeEach(() => {
    jest.mocked(resolveReadingScope).mockReset()
    jest.mocked(isReadingPositionFingerprintValid).mockReset()
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('evaluateReadingResumeFingerprint returns pending while scope is missing', () => {
    jest.mocked(resolveReadingScope).mockReturnValue(null)
    expect(evaluateReadingResumeFingerprint(resume, 'slug', 0, 30)).toEqual({ status: 'pending' })
    expect(evaluateReadingResumeFingerprint(resume, 'slug', 29, 30)).toEqual({ status: 'pending' })
    expect(evaluateReadingResumeFingerprint(resume, 'slug', 30, 30)).toEqual({ status: 'dom_missing' })
  })

  it('evaluateReadingResumeFingerprint returns invalid when fingerprint mismatches after retries', () => {
    const scope = document.createElement('div')
    jest.mocked(resolveReadingScope).mockReturnValue(scope)
    jest.mocked(isReadingPositionFingerprintValid).mockReturnValue(false)
    expect(evaluateReadingResumeFingerprint(resume, 'slug', 30, 30)).toEqual({ status: 'invalid' })
  })

  it('runReadingResumeRestoreWithFingerprintRetry skips restore on invalid when configured', () => {
    const scope = document.createElement('div')
    jest.mocked(resolveReadingScope).mockReturnValue(scope)
    jest.mocked(isReadingPositionFingerprintValid).mockReturnValue(false)

    const onRestore = jest.fn()
    const onInvalidFingerprint = jest.fn()
    const onSettled = jest.fn()

    runReadingResumeRestoreWithFingerprintRetry(resume, 'slug', {
      maxFrames: 0,
      skipRestoreOnInvalidFingerprint: true,
      onRestore,
      onInvalidFingerprint,
      onSettled,
    })

    expect(onInvalidFingerprint).toHaveBeenCalled()
    expect(onRestore).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalled()
  })

  it('runReadingResumeRestoreWithFingerprintRetry still restores on invalid for tab navigation', () => {
    const scope = document.createElement('div')
    jest.mocked(resolveReadingScope).mockReturnValue(scope)
    jest.mocked(isReadingPositionFingerprintValid).mockReturnValue(false)

    const onRestore = jest.fn()

    runReadingResumeRestoreWithFingerprintRetry(resume, 'slug', {
      maxFrames: 0,
      skipRestoreOnInvalidFingerprint: false,
      onRestore,
    })

    expect(onRestore).toHaveBeenCalledWith(resume, undefined)
  })

  it('runReadingResumeRestoreWithFingerprintRetry skips restore when DOM never appears', () => {
    jest.mocked(resolveReadingScope).mockReturnValue(null)

    const onRestore = jest.fn()
    const onInvalidFingerprint = jest.fn()
    const onSettled = jest.fn()

    runReadingResumeRestoreWithFingerprintRetry(resume, 'slug', {
      maxFrames: 0,
      skipRestoreOnInvalidFingerprint: true,
      onRestore,
      onInvalidFingerprint,
      onSettled,
    })

    expect(onInvalidFingerprint).toHaveBeenCalled()
    expect(onRestore).not.toHaveBeenCalled()
    expect(onSettled).toHaveBeenCalled()
  })

  it('runReadingResumeRestoreWithFingerprintRetry still restores when DOM missing for tab navigation', () => {
    jest.mocked(resolveReadingScope).mockReturnValue(null)

    const onRestore = jest.fn()

    runReadingResumeRestoreWithFingerprintRetry(resume, 'slug', {
      maxFrames: 0,
      skipRestoreOnInvalidFingerprint: false,
      onRestore,
    })

    expect(onRestore).toHaveBeenCalledWith(resume, undefined)
  })
})
