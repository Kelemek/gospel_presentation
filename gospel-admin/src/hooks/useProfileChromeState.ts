'use client'

import type { ReactNode } from 'react'
import { useProfileDailyVerseChallenge } from '@/hooks/useProfileDailyVerseChallenge'
import { useProfileHighlightUi } from '@/hooks/useProfileHighlightUi'
import { useProfilePresentationReadStatus } from '@/hooks/useProfilePresentationReadStatus'
import { useProfileResourceTabs } from '@/hooks/useProfileResourceTabs'
import { useProfileShareResource } from '@/hooks/useProfileShareResource'
import { useProfileSlideoutMenu } from '@/hooks/useProfileSlideoutMenu'
import { useProfileVersePins } from '@/hooks/useProfileVersePins'
import type { GospelSection } from '@/lib/types'

export type UseProfileChromeStateOptions = {
  isHydrated: boolean
  profileSlug: string
  profileTitle: string
  sections: GospelSection[]
  showAlert: (content: ReactNode) => void
  showConfirm: (message: string) => boolean | Promise<boolean>
}

export function useProfileChromeState({
  isHydrated,
  profileSlug,
  profileTitle,
  sections,
  showAlert,
  showConfirm,
}: UseProfileChromeStateOptions) {
  const { isMenuOpen, toggleMenu, closeMenu, openMenu, deferCloseMenuForFilePickerRef } =
    useProfileSlideoutMenu()
  const { dailyVerseChallengeVersion, completeDailyVerseChallengeIfMatch } =
    useProfileDailyVerseChallenge(showAlert)
  const { isSharingResource, handleShareResource } = useProfileShareResource({
    profileSlug,
    profileTitle,
    showAlert,
  })
  const { presentationMarkedReadComplete, handleMarkPresentationUnread } =
    useProfilePresentationReadStatus(profileSlug)
  const {
    versePinMap,
    versePinsList,
    bumpVersePins,
    handleRemoveVersePin,
    handleClearAllVersePins,
  } = useProfileVersePins(profileSlug)
  const {
    highlightRevision,
    bumpHighlights,
    highlightsByScopeId,
    activeHighlightId,
    focusHighlightById,
    requestRemoveHighlightFromBody,
  } = useProfileHighlightUi({
    isHydrated,
    profileSlug,
    profileTitle,
    showConfirm,
  })
  const {
    resourceTabs,
    mainContentRef,
    resourceSearchOpen,
    handleToggleResourceSearch,
    clearResourceSearch,
  } = useProfileResourceTabs({
    isHydrated,
    profileSlug,
    profileTitle,
    sections,
  })

  return {
    isMenuOpen,
    toggleMenu,
    closeMenu,
    openMenu,
    deferCloseMenuForFilePickerRef,
    dailyVerseChallengeVersion,
    completeDailyVerseChallengeIfMatch,
    isSharingResource,
    handleShareResource,
    presentationMarkedReadComplete,
    handleMarkPresentationUnread,
    versePinMap,
    versePinsList,
    bumpVersePins,
    handleRemoveVersePin,
    handleClearAllVersePins,
    highlightRevision,
    bumpHighlights,
    highlightsByScopeId,
    activeHighlightId,
    focusHighlightById,
    requestRemoveHighlightFromBody,
    resourceTabs,
    mainContentRef,
    resourceSearchOpen,
    handleToggleResourceSearch,
    clearResourceSearch,
  }
}
