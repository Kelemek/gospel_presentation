import type { ProfileContentHooksSlice } from '@/lib/profileContentHooksTypes'
import type { ProfileContentModalsProps } from '@/lib/profileContentModalTypes'

export function buildProfileContentModalsProps(
  hooks: ProfileContentHooksSlice
): ProfileContentModalsProps {
  const {
    profileSlug,
    profileInfo,
    scriptureModal,
    studyModals,
    navigateMcheynePlanDay,
    navigateMcheyneLatest,
    highlightRevision,
    bumpHighlights,
  } = hooks

  const {
    activeScripture,
    effectiveModalOpenAnchors,
    scriptureModalPresentationLocation,
    scriptureModalHighlightPicker,
    mcheyneDayListenReferences,
    syncMcheynePlaylistChapter,
    closeModal,
    openScriptureFromTabEntry,
    navigateScriptureInReader,
    clearMcheynePlanCardPinSession,
    hasPrevious,
    hasNext,
    navigateToPrevious,
    navigateToNext,
    modalPinDraftColor,
    modalPinSyncedKey,
    modalPinDropdownColors,
    setModalPinUserOverride,
    handleScriptureClick,
  } = scriptureModal

  return {
    scripture: {
      profileSlug,
      profileTitle: profileInfo.title,
      activeScripture,
      effectiveModalOpenAnchors,
      mcheyneDayListenReferences,
      syncMcheynePlaylistChapter,
      closeModal,
      openScriptureFromTabEntry,
      navigateScriptureInReader,
      clearMcheynePlanCardPinSession,
      hasPrevious,
      hasNext,
      navigateToPrevious,
      navigateToNext,
      scriptureModalPresentationLocation,
      scriptureModalHighlightPicker,
      highlightRevision,
      bumpHighlights,
      modalPinDraftColor,
      modalPinSyncedKey,
      modalPinDropdownColors,
      setModalPinUserOverride,
      onOpenSpurgeonStudy: studyModals.handleOpenSpurgeonStudy,
    },
    study: {
      spurgeon: {
        isOpen: studyModals.isSpurgeonLibraryOpen,
        modalTitle: studyModals.studyModalTitle,
        libraryFocus: studyModals.studyLibraryFocus,
        initialByReference: studyModals.spurgeonStudyReference,
        onClose: studyModals.handleCloseSpurgeonLibrary,
        onOpenScriptureReference: studyModals.handleSpurgeonOpenScripture,
      },
      morneve: {
        isOpen: studyModals.isMorneveLibraryOpen,
        onClose: studyModals.closeMorneveLibrary,
      },
      mcheyne: {
        isOpen: studyModals.isMcheynePlanModalOpen,
        onClose: studyModals.closeMcheynePlan,
        navigatePlanDay: navigateMcheynePlanDay,
        navigateLatest: navigateMcheyneLatest,
      },
      onDismissScriptureAndPractice: studyModals.dismissScriptureAndPractice,
      bibleReader: {
        isOpen: studyModals.bibleReaderOpen,
        onClose: studyModals.closeBibleReader,
        onConfirm: (ref, meta) => {
          handleScriptureClick(ref, undefined, undefined, {
            initialChapterView: meta.initialChapterView,
            pickerNavigation: true,
          })
          studyModals.closeBibleReader()
        },
      },
      memorizationPractice: {
        verse: studyModals.memorizationPracticeVerse,
        onClose: studyModals.closeMemorizationPractice,
        onUpdated: studyModals.updateMemorizationPracticeVerse,
      },
    },
  }
}
