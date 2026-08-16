/** @jest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react'
import { useProfileReadingResumeRestore } from '@/hooks/useProfileReadingResumeRestore'
import { GOSPEL_CLIENT_STORAGE_CHANGED_EVENT } from '@/lib/gospelClientStorageEvents'
import {
  loadProfileReadingResume,
  profileReadingResumeStorageKey,
  type ProfileReadingResumeV1,
} from '@/lib/profileReadingResumeStorage'
import { restoreReadingPosition } from '@/lib/profileReadingPosition'
import {
  markProfileResourceTabNavigation,
  peekProfileResourceTabNavigation,
  resetProfileResourceTabNavigationForTests,
} from '@/lib/profileResourceTabNavigation'

jest.mock('@/lib/gospelClientStorage', () => ({
  hydrateGospelClientStorage: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/lib/gospelDeviceSync/waitForStartupPull', () => ({
  waitForDeviceSyncStartupPull: jest.fn(() => Promise.resolve()),
}))

jest.mock('@/lib/profileReadingResumeStorage', () => {
  const actual = jest.requireActual('@/lib/profileReadingResumeStorage')
  return {
    ...actual,
    loadProfileReadingResume: jest.fn(),
  }
})

jest.mock('@/lib/profileReadingPosition', () => {
  const actual = jest.requireActual('@/lib/profileReadingPosition')
  return {
    ...actual,
    restoreReadingPosition: jest.fn(() => () => {}),
    resolveReadingScope: jest.fn(() => document.createElement('div')),
    isReadingPositionFingerprintValid: jest.fn(() => true),
  }
})

const resume: ProfileReadingResumeV1 = {
  v: 1,
  anchorId: 'section-1-0',
  plainOffset: 40,
  fingerprint: 'fp-test',
}

function renderRestoreHook(
  overrides: Partial<Parameters<typeof useProfileReadingResumeRestore>[0]> = {}
) {
  const profileReadingNavAppliedRef = { current: false }
  const readingResumeAppVisibleRestoreKeyRef = { current: null as string | null }
  const lastSavedReadingResumeRef = { current: null as ProfileReadingResumeV1 | null }
  const lastSavedReadingResumeSlugRef = { current: null as string | null }

  const hook = renderHook(() =>
    useProfileReadingResumeRestore({
      isHydrated: true,
      profileSlug: 'default',
      sectionCount: 1,
      sections: [{ id: 's1', title: 'S', subsections: [] } as never],
      selectedScriptureIsOpen: false,
      studyRefParam: '',
      mcheynePlanDayParam: '',
      mcheyneResumePinParam: '',
      profileReadingNavAppliedRef,
      readingResumeAppVisibleRestoreKeyRef,
      lastSavedReadingResumeRef,
      lastSavedReadingResumeSlugRef,
      ...overrides,
    })
  )

  return {
    ...hook,
    profileReadingNavAppliedRef,
    readingResumeAppVisibleRestoreKeyRef,
  }
}

describe('useProfileReadingResumeRestore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    resetProfileResourceTabNavigationForTests()
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
    jest.mocked(loadProfileReadingResume).mockReturnValue(null)
    jest.mocked(restoreReadingPosition).mockImplementation(
      (_anchorId, _plainOffset, _fingerprint, _slug, options) => {
        options?.onDone?.()
        return () => {}
      }
    )
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 1
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('returns restore helpers without throwing', () => {
    const { result } = renderRestoreHook()

    expect(typeof result.current.tryAppResumeReadingRestore).toBe('function')
    expect(typeof result.current.trySyncReadingResumeRestore).toBe('function')
    expect(typeof result.current.cancelReadingResumeRestore).toBe('function')
  })

  it('does not load stored resume when studyRef blocks restore', async () => {
    const { result } = renderRestoreHook({ studyRefParam: 'Romans 8:1' })

    await act(async () => {
      result.current.tryAppResumeReadingRestore()
      await Promise.resolve()
    })

    expect(loadProfileReadingResume).not.toHaveBeenCalled()
  })

  it('restores from storage on client storage change for the profile resume key', async () => {
    jest.mocked(loadProfileReadingResume).mockReturnValue(resume)

    renderRestoreHook()

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(GOSPEL_CLIENT_STORAGE_CHANGED_EVENT, {
          detail: { key: profileReadingResumeStorageKey('default') },
        })
      )
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(loadProfileReadingResume).toHaveBeenCalledWith('default')
      expect(restoreReadingPosition).toHaveBeenCalled()
    })
  })

  it('marks tab navigation applied and clears staging when resume is null', async () => {
    markProfileResourceTabNavigation('default', null)
    const { profileReadingNavAppliedRef } = renderRestoreHook()

    await act(async () => {
      await Promise.resolve()
    })

    expect(profileReadingNavAppliedRef.current).toBe(true)
    expect(peekProfileResourceTabNavigation('default')).toBeUndefined()
  })

  it('starts tab-nav restore when staged resume exists', async () => {
    markProfileResourceTabNavigation('default', resume)
    const { profileReadingNavAppliedRef } = renderRestoreHook()

    await act(async () => {
      await Promise.resolve()
    })

    expect(profileReadingNavAppliedRef.current).toBe(true)
    expect(restoreReadingPosition).toHaveBeenCalledWith(
      resume.anchorId,
      resume.plainOffset,
      resume.fingerprint,
      'default',
      expect.objectContaining({
        onDone: expect.any(Function),
        onGiveUp: expect.any(Function),
      })
    )
    expect(peekProfileResourceTabNavigation('default')).toBeUndefined()
  })

  it('defers initial mount restore when studyRef is present', async () => {
    const { profileReadingNavAppliedRef } = renderRestoreHook({ studyRefParam: 'John 3:16' })

    await act(async () => {
      jest.advanceTimersByTime(150)
      await Promise.resolve()
    })

    expect(profileReadingNavAppliedRef.current).toBe(true)
    expect(loadProfileReadingResume).not.toHaveBeenCalled()
  })
})
