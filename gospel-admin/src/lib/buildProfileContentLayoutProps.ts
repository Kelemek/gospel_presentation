import type { ProfileContentLayoutProps } from '@/components/ProfileContentLayout'
import type { ProfileContentHooksSlice } from '@/lib/profileContentHooksTypes'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'

function profileInfoForHeader(profileInfo: ProfileContentProfileInfo) {
  return {
    title: profileInfo.title,
    slug: profileInfo.slug,
    favoriteScriptures: profileInfo.favoriteScriptures,
  }
}

function profileInfoForSlideout(profileInfo: ProfileContentProfileInfo) {
  return {
    title: profileInfo.title,
    description: profileInfo.description,
    slug: profileInfo.slug,
    favoriteScriptures: profileInfo.favoriteScriptures,
  }
}

export function buildProfileContentLayoutProps(
  hooks: ProfileContentHooksSlice
): ProfileContentLayoutProps {
  const {
    profileInfo,
    sections,
    profileSlug,
    openMenu,
    isMenuOpen,
    toggleMenu,
    canEdit,
    fromEditor,
    focusHighlightById,
    studyModals,
    bumpHighlights,
    handleShareResource,
    isSharingResource,
    resourceTabs,
    handleSelectResourceTab,
    handleCloseResourceTab,
    resourceSearchOpen,
    handleToggleResourceSearch,
    mainContentRef,
    scriptureModal,
    handleRemoveVersePin,
    versePinsList,
    highlightsByScopeId,
    activeHighlightId,
    requestRemoveHighlightFromBody,
    closeMenu,
    deferCloseMenuForFilePickerRef,
    dailyVerseChallengeVersion,
    handleClearAllVersePins,
    presentationMarkedReadComplete,
    handleMarkPresentationUnread,
  } = hooks

  return {
    onOpenMenuHover: openMenu,
    header: {
      isMenuOpen,
      onToggleMenu: toggleMenu,
      canEdit,
      fromEditor,
      profileInfo: profileInfoForHeader(profileInfo),
      sections,
      profileSlug,
      onFocusHighlight: focusHighlightById,
      onOpenScriptureHighlight: studyModals.handleOpenScriptureHighlight,
      onHighlightsChanged: bumpHighlights,
      onShareResource: () => void handleShareResource(),
      isSharingResource,
      resourceTabs,
      onSelectResourceTab: handleSelectResourceTab,
      onCloseResourceTab: handleCloseResourceTab,
      resourceSearchOpen,
      onToggleResourceSearch: handleToggleResourceSearch,
      contentRootRef: mainContentRef,
      scriptureModalOpen: scriptureModal.activeScripture.isOpen,
    },
    main: {
      mainContentRef,
      sections,
      onScriptureClick: scriptureModal.handleScriptureClick,
      versePinsList,
      onRemoveVersePin: handleRemoveVersePin,
      profileSlug: profileInfo.slug,
      savedAnswers: profileInfo.savedAnswers,
      highlightsByScopeId,
      activeHighlightId,
      onHighlightMarkClick: requestRemoveHighlightFromBody,
      isMenuOpen,
      onCloseMenu: closeMenu,
    },
    slideout: isMenuOpen
      ? {
          onClose: closeMenu,
          deferCloseMenuForFilePickerRef,
          sections,
          profileInfo: profileInfoForSlideout(profileInfo),
          canEdit,
          dailyVerseChallengeVersion,
          versePinsList,
          onClearAllVersePins: handleClearAllVersePins,
          presentationMarkedReadComplete,
          onMarkPresentationUnread: handleMarkPresentationUnread,
          onMemorizationPracticeStart: studyModals.handleMemorizationPracticeStart,
          onOpenStudyLibrary: studyModals.openStudyLibrary,
          onOpenMorneveLibrary: studyModals.openMorneveLibrary,
          onOpenMcheynePlan: studyModals.openMcheynePlan,
          onOpenBibleReader: studyModals.handleOpenBibleReader,
        }
      : null,
  }
}
