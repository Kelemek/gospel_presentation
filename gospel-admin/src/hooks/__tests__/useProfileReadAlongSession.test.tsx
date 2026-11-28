/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { scrollReadAlongPlainOffsetToVerticalCenter } from '@/lib/scrollReadAlongPlain'
import { useProfileReadAlongSession } from '@/hooks/useProfileReadAlongSession'

jest.mock('@/lib/scrollReadAlongPlain', () => {
  const actual = jest.requireActual('@/lib/scrollReadAlongPlain')
  return {
    ...actual,
    scrollReadAlongPlainOffsetToVerticalCenter: jest.fn(),
  }
})

describe('useProfileReadAlongSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('schedules instant scroll on the next animation frame', async () => {
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'lgal' }))
    const scope = document.createElement('div')
    act(() => {
      result.current.readAlongScopeRef.current = scope
      result.current.readAlongPlainLenRef.current = 100
      result.current.scheduleReadAlongUi({ scroll: 12 })
    })
    expect(scrollReadAlongPlainOffsetToVerticalCenter).not.toHaveBeenCalled()
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
    expect(scrollReadAlongPlainOffsetToVerticalCenter).toHaveBeenCalledWith(
      scope,
      100,
      12,
      expect.any(Object),
      expect.objectContaining({
        lineScrollState: expect.objectContaining({ lastVisualLineKey: null }),
      })
    )
  })

  it('teardown cancels pending scroll scheduling', async () => {
    const { result } = renderHook(() => useProfileReadAlongSession({ profileSlug: 'lgal' }))
    act(() => {
      result.current.scheduleReadAlongUi({ scroll: 9 })
      result.current.teardownReadAlong()
    })
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
    expect(scrollReadAlongPlainOffsetToVerticalCenter).not.toHaveBeenCalled()
  })
})