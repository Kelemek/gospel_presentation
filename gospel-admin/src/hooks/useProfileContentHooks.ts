'use client'

import { useProfileContentBootstrap } from '@/hooks/useProfileContentBootstrap'
import { useProfileChromeState } from '@/hooks/useProfileChromeState'
import { useProfileContentReaderHooks } from '@/hooks/useProfileContentReaderHooks'
import { buildProfileContentLayoutProps } from '@/lib/buildProfileContentLayoutProps'
import { buildProfileContentModalsProps } from '@/lib/buildProfileContentModalsProps'
import type { ProfileContentHooksSlice } from '@/lib/profileContentHooksTypes'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'
import type { GospelSection } from '@/lib/types'
import type { ProfileContentLayoutProps } from '@/components/ProfileContentLayout'
import type { ProfileContentModalsProps } from '@/lib/profileContentModalTypes'
import type { BibleTranslation } from '@/contexts/TranslationContext'

export type UseProfileContentHooksOptions = {
  sections: GospelSection[]
  profileInfo: ProfileContentProfileInfo
  onReadingResumeSettled?: () => void
  allowVisitTracking?: boolean
}

export type UseProfileContentHooksResult = {
  layout: ProfileContentLayoutProps
  modals: ProfileContentModalsProps
  footerAttributionEnabledCodes: BibleTranslation[] | null
}

export type { ProfileContentHooksSlice } from '@/lib/profileContentHooksTypes'

export function useProfileContentHooks(
  options: UseProfileContentHooksOptions
): UseProfileContentHooksResult {
  const bootstrap = useProfileContentBootstrap(options)
  const chrome = useProfileChromeState({
    isHydrated: bootstrap.isHydrated,
    profileSlug: bootstrap.profileSlug,
    profileTitle: bootstrap.profileTitle,
    sections: options.sections,
    showAlert: bootstrap.showAlert,
    showConfirm: bootstrap.showConfirm,
  })

  const reader = useProfileContentReaderHooks({
    isHydrated: bootstrap.isHydrated,
    sectionCount: bootstrap.sectionCount,
    profileSlug: bootstrap.profileSlug,
    profileTitle: bootstrap.profileTitle,
    sections: options.sections,
    profileInfo: options.profileInfo,
    scriptureRefParam: bootstrap.scriptureRefParam,
    scriptureViewParam: bootstrap.scriptureViewParam,
    translationParam: bootstrap.translationParam,
    studyRefParam: bootstrap.studyRefParam,
    mcheynePlanDayParam: bootstrap.mcheynePlanDayParam,
    mcheyneResumePinParam: bootstrap.mcheyneResumePinParam,
    translation: bootstrap.translation,
    enabledTranslations: bootstrap.enabledTranslations,
    translationsLoading: bootstrap.translationsLoading,
    setTranslation: bootstrap.setTranslation,
    router: bootstrap.router,
    versePinMap: chrome.versePinMap,
    bumpVersePins: chrome.bumpVersePins,
    persistReadingResumeBeforeLeave: bootstrap.persistReadingResumeBeforeLeave,
    registerPersistBeforeLeave: bootstrap.registerPersistBeforeLeave,
    completeDailyVerseChallengeIfMatch: chrome.completeDailyVerseChallengeIfMatch,
    closeMenu: chrome.closeMenu,
    clearResourceSearch: chrome.clearResourceSearch,
    onReadingResumeSettled: options.onReadingResumeSettled,
  })

  const slice: ProfileContentHooksSlice = {
    ready: true,
    profileInfo: options.profileInfo,
    sections: options.sections,
    profileSlug: bootstrap.profileSlug,
    profileTitle: bootstrap.profileTitle,
    footerAttributionEnabledCodes: bootstrap.footerAttributionEnabledCodes,
    fromEditor: bootstrap.fromEditor,
    canEdit: bootstrap.canEdit,
    isMenuOpen: chrome.isMenuOpen,
    toggleMenu: chrome.toggleMenu,
    closeMenu: chrome.closeMenu,
    openMenu: chrome.openMenu,
    deferCloseMenuForFilePickerRef: chrome.deferCloseMenuForFilePickerRef,
    dailyVerseChallengeVersion: chrome.dailyVerseChallengeVersion,
    isSharingResource: chrome.isSharingResource,
    handleShareResource: chrome.handleShareResource,
    presentationMarkedReadComplete: chrome.presentationMarkedReadComplete,
    handleMarkPresentationUnread: chrome.handleMarkPresentationUnread,
    versePinsList: chrome.versePinsList,
    handleRemoveVersePin: chrome.handleRemoveVersePin,
    handleClearAllVersePins: chrome.handleClearAllVersePins,
    highlightRevision: chrome.highlightRevision,
    bumpHighlights: chrome.bumpHighlights,
    highlightsByScopeId: chrome.highlightsByScopeId,
    activeHighlightId: chrome.activeHighlightId,
    focusHighlightById: chrome.focusHighlightById,
    requestRemoveHighlightFromBody: chrome.requestRemoveHighlightFromBody,
    resourceTabs: chrome.resourceTabs,
    mainContentRef: chrome.mainContentRef,
    resourceSearchOpen: chrome.resourceSearchOpen,
    handleToggleResourceSearch: chrome.handleToggleResourceSearch,
    handleSelectResourceTab: reader.handleSelectResourceTab,
    handleCloseResourceTab: reader.handleCloseResourceTab,
    scriptureModal: reader.scriptureModal,
    studyModals: reader.studyModals,
    navigateMcheynePlanDay: reader.navigateMcheynePlanDay,
    navigateMcheyneLatest: reader.navigateMcheyneLatest,
  }

  return {
    layout: buildProfileContentLayoutProps(slice),
    modals: buildProfileContentModalsProps(slice),
    footerAttributionEnabledCodes: bootstrap.footerAttributionEnabledCodes,
  }
}
