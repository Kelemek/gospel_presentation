/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'
import { clearReadAlongDomHighlight } from '@/lib/profileReadAlongDomHighlight'
import { scrollReadAlongPlainOffsetIntoViewIfNeeded } from '@/lib/scrollReadAlongPlain'
import {
  saveProfileReadAlongLastSession,
  saveProfileReadAlongProgress,
} from '@/lib/profileReadAlongProgressStorage'
import {
  readProfileReadAlongUnderlineStyleFromStorage,
  writeProfileReadAlongUnderlineStyleToStorage,
} from '@/lib/profileReadAlongUnderlineStyleStorage'

const mockUpdateReadAlongDomHighlight = jest.fn()
const mockUpdateReadAlongDomHighlightVisualLine = jest.fn()
const mockRepaintReadAlongDomHighlightFromPaint = jest.fn((opts) => {
  if (opts.paint.kind === 'word' && opts.paint.endExclusive > opts.paint.start) {
    mockUpdateReadAlongDomHighlight({
      scope: opts.scope,
      plainCollapsedLen: opts.plainCollapsedLen,
      plainStart: opts.paint.start,
      plainEndExclusive: opts.paint.endExclusive,
      listenTextOptions: opts.listenTextOptions,
    })
    return
  }
  if (opts.paint.kind === 'line') {
    mockUpdateReadAlongDomHighlightVisualLine({
      scope: opts.scope,
      plainCollapsedLen: opts.plainCollapsedLen,
      plainCaret: opts.paint.plainCaret,
      listenTextOptions: opts.listenTextOptions,
    })
  }
})

jest.mock('@/lib/profileReadAlongDomHighlight', () => ({
  clearReadAlongDomHighlight: jest.fn(),
  updateReadAlongDomHighlight: (...args: unknown[]) => mockUpdateReadAlongDomHighlight(...args),
  updateReadAlongDomHighlightVisualLine: (...args: unknown[]) =>
    mockUpdateReadAlongDomHighlightVisualLine(...args),
  repaintReadAlongDomHighlightFromPaint: (...args: unknown[]) =>
    mockRepaintReadAlongDomHighlightFromPaint(...args),
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
  readAlongListenScrollBehavior: jest.fn(() => 'instant'),
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

  it('uses instant scroll and starts underline resync while scrolling', () => {
    const parentRaf = window.requestAnimationFrame
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))

    document.body.innerHTML = '<div id="section-1"><p>Listen text here.</p></div>'
    const scope = document.getElementById('section-1') as HTMLElement

    let flushCb: FrameRequestCallback | null = null
    let followupCb: FrameRequestCallback | null = null
    const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (flushCb === null) {
        flushCb = cb
        return 1
      }
      followupCb = cb
      return 2
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

    expect(flushCb).not.toBeNull()
    expect(mockUpdateReadAlongDomHighlight).not.toHaveBeenCalled()

    act(() => {
      flushCb!(0)
    })

    expect(scrollReadAlongPlainOffsetIntoViewIfNeeded).toHaveBeenCalledWith(
      scope,
      18,
      4,
      'instant',
      expect.any(Object)
    )
    expect(followupCb).not.toBeNull()
    expect(mockUpdateReadAlongDomHighlight).not.toHaveBeenCalled()

    act(() => {
      followupCb!(0)
    })

    expect(mockUpdateReadAlongDomHighlight).toHaveBeenCalledWith({
      scope,
      plainCollapsedLen: 18,
      plainStart: 4,
      plainEndExclusive: 8,
      listenTextOptions: expect.any(Object),
    })

    rafSpy.mockRestore()
    window.requestAnimationFrame = parentRaf
  })

  it('repaints stored highlight after scroll-only read-along UI update', () => {
    const parentRaf = window.requestAnimationFrame
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'demo' }))

    document.body.innerHTML = '<div id="section-1"><p>Listen text here.</p></div>'
    const scope = document.getElementById('section-1') as HTMLElement

    act(() => {
      result.current.readAlongScopeRef.current = scope
      result.current.readAlongPlainLenRef.current = 18
      result.current.readAlongHighlightPaintRef.current = { kind: 'word', start: 0, endExclusive: 5 }
    })

    let flushCb: FrameRequestCallback | null = null
    let followupCb: FrameRequestCallback | null = null
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      if (flushCb === null) {
        flushCb = cb
        return 1
      }
      followupCb = cb
      return 2
    })

    act(() => {
      result.current.scheduleReadAlongUi({ scroll: 9, scrollBehavior: 'auto' })
    })

    act(() => {
      flushCb!(0)
    })
    act(() => {
      followupCb!(0)
    })

    expect(mockUpdateReadAlongDomHighlight).toHaveBeenCalledWith({
      scope,
      plainCollapsedLen: 18,
      plainStart: 0,
      plainEndExclusive: 5,
      listenTextOptions: expect.any(Object),
    })

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
