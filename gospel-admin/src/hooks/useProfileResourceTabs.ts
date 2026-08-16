'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { GospelSection } from '@/lib/types'
import { clearProfileResourceSearchMarks } from '@/lib/profileResourceInPageSearch'
import {
  bindProfileIosKeyboardHeaderSync,
} from '@/lib/scrollToTocAnchor'
import {
  isProfileResourceSearchInputElement,
  isProfileResourceSearchInputFocused,
} from '@/lib/profileResourceInPageSearch'
import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'
import {
  GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT,
  loadProfileRecentResourcesForTabs,
} from '@/lib/profileLastOpenResourceStorage'

export type UseProfileResourceTabsOptions = {
  isHydrated: boolean
  profileSlug: string
  profileTitle: string
  sections: GospelSection[]
}

export function useProfileResourceTabs({
  isHydrated,
  profileSlug,
  profileTitle,
  sections,
}: UseProfileResourceTabsOptions) {
  const [resourceTabs, setResourceTabs] = useState(() =>
    loadProfileRecentResourcesForTabs(profileSlug, profileTitle)
  )
  const mainContentRef = useRef<HTMLElement>(null)
  const [resourceSearchBySlug, setResourceSearchBySlug] = useState<{
    slug: string
    open: boolean
  } | null>(null)
  const resourceSearchOpen =
    resourceSearchBySlug?.slug === profileSlug && resourceSearchBySlug.open

  const handleToggleResourceSearch = useCallback(() => {
    setResourceSearchBySlug((prev) => {
      if (prev?.slug === profileSlug) return { slug: profileSlug, open: !prev.open }
      return { slug: profileSlug, open: true }
    })
  }, [profileSlug])

  const refreshResourceTabs = useCallback(() => {
    setResourceTabs(loadProfileRecentResourcesForTabs(profileSlug, profileTitle))
  }, [profileSlug, profileTitle])

  useEffect(() => {
    if (!isHydrated || !isMemorizeIosWebHost()) return
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    const header = document.querySelector<HTMLElement>('[data-profile-sticky-header]')
    if (!header) return

    let unbindSync: (() => void) | null = null

    const attachSync = () => {
      if (unbindSync) return
      unbindSync = bindProfileIosKeyboardHeaderSync({
        header,
        viewport: vv,
        isSearchFocused: isProfileResourceSearchInputFocused,
      })
    }

    const detachSync = () => {
      unbindSync?.()
      unbindSync = null
    }

    const onFocusIn = (event: FocusEvent) => {
      if (!isProfileResourceSearchInputElement(event.target)) return
      attachSync()
    }

    const onFocusOut = (event: FocusEvent) => {
      if (!isProfileResourceSearchInputElement(event.target)) return
      requestAnimationFrame(() => {
        if (!isProfileResourceSearchInputFocused()) detachSync()
      })
    }

    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)

    if (isProfileResourceSearchInputFocused()) {
      attachSync()
    } else if (!resourceSearchOpen) {
      detachSync()
    }

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      detachSync()
    }
  }, [isHydrated, sections, profileTitle, resourceSearchOpen])

  useEffect(() => {
    clearProfileResourceSearchMarks(mainContentRef.current)
  }, [profileSlug])

  useEffect(() => {
    window.addEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, refreshResourceTabs)
    return () => {
      window.removeEventListener(GOSPEL_PROFILE_LAST_OPEN_CHANGED_EVENT, refreshResourceTabs)
    }
  }, [refreshResourceTabs])

  const clearResourceSearch = useCallback(() => {
    setResourceSearchBySlug(null)
  }, [])

  return {
    resourceTabs,
    mainContentRef,
    resourceSearchOpen,
    handleToggleResourceSearch,
    clearResourceSearch,
  }
}
