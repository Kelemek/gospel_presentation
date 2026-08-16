'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT } from '@/lib/bookmarksPanelCloseEvent'
import { dispatchRevealActiveOpenItemTab } from '@/lib/openItemTabBarScrollStorage'

export function useProfileSlideoutMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  /** Skip desktop `onMouseLeave` close while the restore JSON file picker is open. */
  const deferCloseMenuForFilePickerRef = useRef(false)

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((open) => !open)
    dispatchRevealActiveOpenItemTab()
  }, [])

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false)
  }, [])

  const openMenu = useCallback(() => {
    setIsMenuOpen(true)
  }, [])

  useEffect(() => {
    const onTourCloseMenu = (): void => {
      setIsMenuOpen(false)
    }
    window.addEventListener(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT, onTourCloseMenu)
    return () => window.removeEventListener(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT, onTourCloseMenu)
  }, [])

  return {
    isMenuOpen,
    toggleMenu,
    closeMenu,
    openMenu,
    deferCloseMenuForFilePickerRef,
  }
}
