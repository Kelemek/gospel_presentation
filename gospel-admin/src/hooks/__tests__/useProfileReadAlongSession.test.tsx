/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'
import { clearReadAlongDomHighlight } from '@/lib/profileReadAlongDomHighlight'
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
