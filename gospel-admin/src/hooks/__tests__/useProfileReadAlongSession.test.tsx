/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'
import {
  clearReadAlongDomHighlight,
  updateReadAlongDomHighlight,
} from '@/lib/profileReadAlongDomHighlight'
import { scrollReadAlongPlainOffsetIntoViewIfNeeded } from '@/lib/scrollReadAlongPlain'
import {
  saveProfileReadAlongLastSession,
  saveProfileReadAlongProgress,
} from '@/lib/profileReadAlongProgressStorage'
import {
  readProfileReadAlongUnderlineStyleFromStorage,
  writeProfileReadAlongUnderlineStyleToStorage,
} from '@/lib/profileReadAlongUnderlineStyleStorage'

jest.mock('@/lib/profileReadAlongDomHighlight', () => ({
  clearReadAlongDomHighlight: jest.fn(),
  updateReadAlongDomHighlight: jest.fn(),
  updateReadAlongDomHighlightVisualLine: jest.fn(),
}))

jest.mock('@/lib/profileReadAlongProgressStorage', () => ({
  saveProfileReadAlongProgress: jest.fn(),
  saveProfileReadAlongLastSession: jest.fn(),
}))

jest.mock('@/lib/profileReadAlongUnderlineStyleStorage', () => ({
  readProfileReadAlongUnderlineStyleFromStorage: jest.fn(() => 'word'),
  writeProfileReadAlongUnderlineStyleToStorage: jest.fn(),
}))

jest.mock('@/lib/scrollReadAlongPlain', () => ({
  prefersReducedMotionReadAlong: jest.fn(() => false),
  scrollReadAlongPlainOffsetIntoViewIfNeeded: jest.fn(),
}))

describe('useProfileReadAlongSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('defaults underline on and reads underline style from storage', () => {
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))
    expect(result.current.readAlongUnderlineOn).toBe(true)
    expect(result.current.readAlongUnderlineStyle).toBe('word')
    expect(readProfileReadAlongUnderlineStyleFromStorage).toHaveBeenCalled()
  })

  it('toggleReadAlongUnderline turns highlight off and clears DOM highlight', () => {
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))

    act(() => {
      result.current.toggleReadAlongUnderline()
    })

    expect(result.current.readAlongUnderlineOn).toBe(false)
    expect(result.current.readAlongUnderlineEnabledRef.current).toBe(false)
    expect(clearReadAlongDomHighlight).toHaveBeenCalledWith(document)
  })

  it('setReadAlongUnderlineStyle updates state and persists to storage', () => {
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))

    act(() => {
      result.current.setReadAlongUnderlineStyle('line')
    })

    expect(result.current.readAlongUnderlineStyle).toBe('line')
    expect(result.current.readAlongUnderlineStyleRef.current).toBe('line')
    expect(writeProfileReadAlongUnderlineStyleToStorage).toHaveBeenCalledWith('line')
  })

  it('flushReadAlongProgressPersist saves progress and last session', () => {
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))

    act(() => {
      result.current.readAlongAnchorIdRef.current = 'section-1'
      result.current.readAlongFingerprintRef.current = '42:abc'
      result.current.readAlongPlainLenRef.current = 100
      result.current.lastPersistedPlainOffsetRef.current = 42
      result.current.flushReadAlongProgressPersist()
    })

    expect(saveProfileReadAlongProgress).toHaveBeenCalledWith('demo', 'section-1', 42, '42:abc')
    expect(saveProfileReadAlongLastSession).toHaveBeenCalledWith('demo', 'section-1', 42, '42:abc')
  })

  it('paints read-along highlight in the same animation frame as scroll', () => {
    const nestedRaf = jest.fn()
    const parentRaf = window.requestAnimationFrame
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))

    document.body.innerHTML = '<div id="section-1"><p>Listen text here.</p></div>'
    const scope = document.getElementById('section-1') as HTMLElement

    let rafCb: FrameRequestCallback | null = null
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCb = cb
      return 1
    })

    act(() => {
      result.current.readAlongScopeRef.current = scope
      result.current.readAlongPlainLenRef.current = 18
      result.current.scheduleReadAlongUi({
        scroll: 4,
        scrollBehavior: 'auto',
        highlight: { kind: 'word', start: 4, endExclusive: 8 },
      })
    })

    expect(rafCb).not.toBeNull()
    expect(updateReadAlongDomHighlight).not.toHaveBeenCalled()
    expect(scrollReadAlongPlainOffsetIntoViewIfNeeded).not.toHaveBeenCalled()

    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      nestedRaf(cb)
      return 2
    }) as typeof window.requestAnimationFrame

    act(() => {
      rafCb!(0)
    })

    expect(scrollReadAlongPlainOffsetIntoViewIfNeeded).toHaveBeenCalledWith(
      scope,
      18,
      4,
      'auto',
      expect.any(Object)
    )
    expect(updateReadAlongDomHighlight).toHaveBeenCalledWith({
      scope,
      plainCollapsedLen: 18,
      plainStart: 4,
      plainEndExclusive: 8,
      listenTextOptions: expect.any(Object),
    })
    expect(nestedRaf).not.toHaveBeenCalled()

    rafSpy.mockRestore()
    window.requestAnimationFrame = parentRaf
  })

  it('scheduleReadAlongProgressPersist debounces flush', () => {
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))

    act(() => {
      result.current.readAlongAnchorIdRef.current = 'section-1'
      result.current.readAlongFingerprintRef.current = '10:xyz'
      result.current.readAlongPlainLenRef.current = 50
      result.current.recordReadAlongProgressPlainOffset(12, true)
    })

    expect(saveProfileReadAlongProgress).not.toHaveBeenCalled()

    act(() => {
      jest.advanceTimersByTime(450)
    })

    expect(saveProfileReadAlongProgress).toHaveBeenCalledWith('demo', 'section-1', 12, '10:xyz')
  })
})
