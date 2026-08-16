import { renderHook, act } from '@testing-library/react'
import { useProfileHighlightUi } from '@/hooks/useProfileHighlightUi'

jest.mock('@/hooks/useProfileTextSelectionHighlights', () => ({
  useProfileTextSelectionHighlights: jest.fn(),
}))

jest.mock('@/lib/profileHighlightsStorage', () => ({
  highlightsForSlug: jest.fn(() => []),
  removeHighlight: jest.fn(),
}))

describe('useProfileHighlightUi', () => {
  it('bumps highlight revision for UI refresh', () => {
    const showConfirm = jest.fn()
    const { result } = renderHook(() =>
      useProfileHighlightUi({
        isHydrated: true,
        profileSlug: 'default',
        profileTitle: 'Default',
        showConfirm,
      })
    )

    const before = result.current.highlightRevision
    act(() => result.current.bumpHighlights())
    expect(result.current.highlightRevision).toBe(before + 1)
  })
})
