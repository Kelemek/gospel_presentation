/**
 * @jest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react'
import { GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import { useProfileSlideoutMenu } from '@/hooks/useProfileSlideoutMenu'

jest.mock('@/lib/openItemTabBarScrollStorage', () => ({
  dispatchRevealActiveOpenItemTab: jest.fn(),
}))

describe('useProfileSlideoutMenu', () => {
  it('toggles and closes the slide-out menu', () => {
    const { result } = renderHook(() => useProfileSlideoutMenu())

    expect(result.current.isMenuOpen).toBe(false)

    act(() => {
      result.current.openMenu()
    })
    expect(result.current.isMenuOpen).toBe(true)

    act(() => {
      result.current.closeMenu()
    })
    expect(result.current.isMenuOpen).toBe(false)
  })

  it('closes when the tour dispatches the close event', () => {
    const { result } = renderHook(() => useProfileSlideoutMenu())

    act(() => {
      result.current.openMenu()
    })
    act(() => {
      window.dispatchEvent(new Event(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT))
    })
    expect(result.current.isMenuOpen).toBe(false)
  })
})
