import type { MutableRefObject } from 'react'
import type { StudyLibraryFocus } from '@/components/SpurgeonSermonsModal'
import type { BibleTranslation } from '@/contexts/TranslationContext'
import type { ScriptureModalState } from '@/lib/profileContentDomHelpers'
import type { ProfileRecentScriptureEntry } from '@/lib/profileLastOpenResourceStorage'
import type { ScriptureModalPresentationLocation } from '@/lib/presentationLocationFromAnchors'
import type { ProfileContentProfileInfo } from '@/lib/profileContentTypes'
import type { GospelSection } from '@/lib/types'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import type { VerseBookmarkColorId, VersePinAnchoredEntry, VersePinColorId } from '@/lib/versePinStorage'

/** Scripture modal surface used by profile layout and modals. */
export type ProfileScriptureModalApi = {
  activeScripture: ScriptureModalState
  effectiveModalOpenAnchors: {
    reference: string
    sectionId: string
    subsectionId: string
  } | null
  scriptureModalPresentationLocation: ScriptureModalPresentationLocation | undefined
  scriptureModalHighlightPicker: boolean
  mcheyneDayListenReferences: string[] | undefined
  syncMcheynePlaylistChapter: (playlistIndex: number) => void
  modalPinDraftColor: VersePinColorId
  modalPinSyncedKey: string | null
  modalPinDropdownColors: VerseBookmarkColorId[]
  setModalPinUserOverride: (
    override: { key: string; color: VerseBookmarkColorId } | null
  ) => void
  handleScriptureClick: (
    reference: string,
    anchorSectionId?: string,
    anchorSubsectionId?: string,
    options?: { initialChapterView?: boolean; pickerNavigation?: boolean }
  ) => void
  navigateScriptureInReader: (
    ref: string,
    meta?: {
      initialChapterView?: boolean
      fromPassagePicker?: boolean
      anchors?: { sectionId: string; subsectionId: string }
    }
  ) => void
  clearMcheynePlanCardPinSession: () => void
  closeModal: () => void
  openScriptureFromTabEntry: (entry: ProfileRecentScriptureEntry) => void | Promise<void>
  hasPrevious: boolean
  hasNext: boolean
  navigateToPrevious: () => void
  navigateToNext: () => void
}

/** Study modal orchestration used by profile layout and modals. */
export type ProfileStudyModalsApi = {
  isSpurgeonLibraryOpen: boolean
  isMorneveLibraryOpen: boolean
  isMcheynePlanModalOpen: boolean
  bibleReaderOpen: boolean
  spurgeonStudyReference: string | null
  studyModalTitle: string
  studyLibraryFocus: StudyLibraryFocus
  memorizationPracticeVerse: MemorizedVerse | null
  openStudyLibrary: (
    focus: StudyLibraryFocus,
    menuTitle?: string,
    reference?: string | null
  ) => void
  handleOpenSpurgeonStudy: (reference: string) => void
  handleCloseSpurgeonLibrary: () => void
  handleSpurgeonOpenScripture: (ref: string) => void
  dismissScriptureAndPractice: () => void
  handleOpenScriptureHighlight: (reference: string) => void
  handleOpenBibleReader: () => void
  handleMemorizationPracticeStart: (verse: MemorizedVerse) => void
  openMorneveLibrary: () => void
  closeMorneveLibrary: () => void
  openMcheynePlan: () => void
  closeMcheynePlan: () => void
  closeBibleReader: () => void
  closeMemorizationPractice: () => void
  updateMemorizationPracticeVerse: (verse: MemorizedVerse | null) => void
}

export type ProfileHighlightScopeMap = Record<
  string,
  Array<{ id: string; startOffset: number; endOffset: number }>
>

export type ProfileResourceTab = {
  slug: string
  title: string
}

/** Composed profile page state passed to view-model builders. */
export type ProfileContentHooksSlice = {
  ready: true
  profileInfo: ProfileContentProfileInfo
  sections: GospelSection[]
  profileSlug: string
  profileTitle: string
  footerAttributionEnabledCodes: BibleTranslation[] | null
  fromEditor: boolean
  canEdit: boolean
  isMenuOpen: boolean
  toggleMenu: () => void
  closeMenu: () => void
  openMenu: () => void
  deferCloseMenuForFilePickerRef: MutableRefObject<boolean>
  dailyVerseChallengeVersion: number
  isSharingResource: boolean
  handleShareResource: () => void | Promise<void>
  presentationMarkedReadComplete: boolean
  handleMarkPresentationUnread: () => void
  versePinsList: VersePinAnchoredEntry[]
  handleRemoveVersePin: (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => void
  handleClearAllVersePins: () => void
  highlightRevision: number
  bumpHighlights: () => void
  highlightsByScopeId: ProfileHighlightScopeMap
  activeHighlightId: string | null
  focusHighlightById: (highlightId: string) => void
  requestRemoveHighlightFromBody: (highlightId: string) => void | Promise<void>
  resourceTabs: ProfileResourceTab[]
  mainContentRef: MutableRefObject<HTMLElement | null>
  resourceSearchOpen: boolean
  handleToggleResourceSearch: () => void
  handleSelectResourceTab: (slug: string) => void
  handleCloseResourceTab: (slug: string) => void
  scriptureModal: ProfileScriptureModalApi
  studyModals: ProfileStudyModalsApi
  navigateMcheynePlanDay: (planDay: number) => void
  navigateMcheyneLatest: () => void
}
