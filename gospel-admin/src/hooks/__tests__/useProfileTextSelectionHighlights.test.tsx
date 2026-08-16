/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { useProfileTextSelectionHighlights } from '@/hooks/useProfileTextSelectionHighlights'
import { resetGospelClientStorageForTests } from '@/lib/gospelClientStorage'
import { highlightsForSlug } from '@/lib/profileHighlightsStorage'
import { installTestLocalStorage } from '@/lib/testing/testLocalStorage'

describe('useProfileTextSelectionHighlights', () => {
  beforeEach(() => {
    installTestLocalStorage()
    resetGospelClientStorageForTests()
    document.body.innerHTML =
      '<p data-highlight-scope="scope-1" data-highlight-anchor-id="section-1-0" data-highlight-location-label="Section 1">Hello world</p>'
  })

  it('saves a highlight and notifies when the user selects text', () => {
    const onHighlightCreated = jest.fn()
    renderHook(() =>
      useProfileTextSelectionHighlights({
        isHydrated: true,
        profileSlug: 'test-slug',
        profileTitle: 'Test Resource',
        bumpHighlights: jest.fn(),
        onHighlightCreated,
      })
    )

    const paragraph = document.querySelector('[data-highlight-scope]')!
    const textNode = paragraph.firstChild!
    const range = document.createRange()
    range.setStart(textNode, 0)
    range.setEnd(textNode, 5)

    const selection = window.getSelection()!
    selection.removeAllRanges()
    selection.addRange(range)

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    expect(onHighlightCreated).toHaveBeenCalledTimes(1)
    const saved = highlightsForSlug('test-slug')
    expect(saved).toHaveLength(1)
    expect(saved[0]?.quote).toBe('Hello')
    expect(selection.rangeCount).toBe(0)
  })

  it('does nothing before hydration', () => {
    const onHighlightCreated = jest.fn()
    renderHook(() =>
      useProfileTextSelectionHighlights({
        isHydrated: false,
        profileSlug: 'test-slug',
        profileTitle: 'Test Resource',
        bumpHighlights: jest.fn(),
        onHighlightCreated,
      })
    )

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    expect(onHighlightCreated).not.toHaveBeenCalled()
    expect(highlightsForSlug('test-slug')).toHaveLength(0)
  })
})
