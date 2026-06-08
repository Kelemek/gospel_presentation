import { renderHook } from '@testing-library/react'
import { usePostHogModalMount, usePostHogModalOpen } from '@/hooks/usePostHogModalOpen'

const mockCaptureModalOpened = jest.fn()

jest.mock('@/lib/posthog-analytics', () => ({
  captureModalOpened: (...args: unknown[]) => mockCaptureModalOpened(...args),
}))

describe('usePostHogModalOpen', () => {
  beforeEach(() => {
    mockCaptureModalOpened.mockClear()
  })

  it('fires modal_opened once when isOpen transitions to true', () => {
    const { rerender } = renderHook(
      ({ isOpen }) => usePostHogModalOpen('coma', isOpen),
      { initialProps: { isOpen: false } }
    )

    expect(mockCaptureModalOpened).not.toHaveBeenCalled()

    rerender({ isOpen: true })
    expect(mockCaptureModalOpened).toHaveBeenCalledTimes(1)
    expect(mockCaptureModalOpened).toHaveBeenCalledWith({ modal: 'coma' })

    rerender({ isOpen: true })
    expect(mockCaptureModalOpened).toHaveBeenCalledTimes(1)
  })

  it('does not fire again when isOpen closes', () => {
    const { rerender } = renderHook(
      ({ isOpen }) => usePostHogModalOpen('coma', isOpen),
      { initialProps: { isOpen: true } }
    )

    expect(mockCaptureModalOpened).toHaveBeenCalledTimes(1)

    rerender({ isOpen: false })
    rerender({ isOpen: true })
    expect(mockCaptureModalOpened).toHaveBeenCalledTimes(2)
  })

  it('includes properties at open time', () => {
    const { rerender } = renderHook(
      ({ isOpen, reference }) =>
        usePostHogModalOpen('scripture', isOpen, { reference }),
      { initialProps: { isOpen: false, reference: 'Romans 8:1' } }
    )

    rerender({ isOpen: true, reference: 'Romans 8:28' })
    expect(mockCaptureModalOpened).toHaveBeenCalledWith({
      modal: 'scripture',
      reference: 'Romans 8:28',
    })
  })
})

describe('usePostHogModalMount', () => {
  beforeEach(() => {
    mockCaptureModalOpened.mockClear()
  })

  it('fires modal_opened once on mount', () => {
    const { unmount, rerender } = renderHook(
      ({ reference }) =>
        usePostHogModalMount('memorize_practice', {
          memorization_kind: 'verse',
          reference,
        }),
      { initialProps: { reference: 'John 3:16' } }
    )

    expect(mockCaptureModalOpened).toHaveBeenCalledTimes(1)
    expect(mockCaptureModalOpened).toHaveBeenCalledWith({
      modal: 'memorize_practice',
      memorization_kind: 'verse',
      reference: 'John 3:16',
    })

    rerender({ reference: 'John 3:17' })
    expect(mockCaptureModalOpened).toHaveBeenCalledTimes(1)

    unmount()
    renderHook(() =>
      usePostHogModalMount('memorize_practice', {
        memorization_kind: 'verse',
        reference: 'John 3:16',
      })
    )
    expect(mockCaptureModalOpened).toHaveBeenCalledTimes(2)
  })
})
