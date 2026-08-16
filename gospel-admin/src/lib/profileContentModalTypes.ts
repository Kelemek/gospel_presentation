'use client'

import type { ComponentProps } from 'react'
import type { StudyLibraryFocus } from '@/components/SpurgeonSermonsModal'
import type { ScriptureModalState } from '@/lib/profileContentDomHelpers'
import type { ScriptureModalPresentationLocation } from '@/lib/presentationLocationFromAnchors'
import type { VerseBookmarkColorId, VersePinColorId } from '@/lib/versePinStorage'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import ScriptureModal from '@/components/ScriptureModal'

type ScriptureTabEntry = Parameters<
  NonNullable<ComponentProps<typeof ScriptureModal>['onScriptureTabActivate']>
>[0]

export type ProfileContentScriptureModalCluster = {
  profileSlug: string
  profileTitle: string
  activeScripture: ScriptureModalState
  effectiveModalOpenAnchors: {
    reference: string
    sectionId: string
    subsectionId: string
  } | null
  mcheyneDayListenReferences: readonly string[] | undefined
  syncMcheynePlaylistChapter: (playlistIndex: number) => void
  closeModal: () => void
  openScriptureFromTabEntry: (entry: ScriptureTabEntry) => void | Promise<void>
  navigateScriptureInReader: (
    ref: string,
    meta?: {
      initialChapterView?: boolean
      fromPassagePicker?: boolean
      anchors?: { sectionId: string; subsectionId: string }
    }
  ) => void
  clearMcheynePlanCardPinSession: () => void
  hasPrevious: boolean
  hasNext: boolean
  navigateToPrevious: () => void
  navigateToNext: () => void
  scriptureModalPresentationLocation: ScriptureModalPresentationLocation | undefined
  scriptureModalHighlightPicker: boolean
  highlightRevision: number
  bumpHighlights: () => void
  modalPinDraftColor: VersePinColorId
  modalPinSyncedKey: string | null
  modalPinDropdownColors: VerseBookmarkColorId[]
  setModalPinUserOverride: (
    override: { key: string; color: VerseBookmarkColorId } | null
  ) => void
  onOpenSpurgeonStudy: (reference: string) => void
}

export type ProfileContentStudyModalsCluster = {
  spurgeon: {
    isOpen: boolean
    modalTitle: string
    libraryFocus: StudyLibraryFocus
    initialByReference: string | null
    onClose: () => void
    onOpenScriptureReference: (reference: string) => void
  }
  morneve: {
    isOpen: boolean
    onClose: () => void
  }
  mcheyne: {
    isOpen: boolean
    onClose: () => void
    navigatePlanDay: (planDay: number) => void
    navigateLatest: () => void
  }
  onDismissScriptureAndPractice: () => void
  bibleReader: {
    isOpen: boolean
    onClose: () => void
    onConfirm: (reference: string, meta: { initialChapterView?: boolean }) => void
  }
  memorizationPractice: {
    verse: MemorizedVerse | null
    onClose: () => void
    onUpdated: (verse: MemorizedVerse | null) => void
  }
}

export type ProfileContentModalsProps = {
  scripture: ProfileContentScriptureModalCluster
  study: ProfileContentStudyModalsCluster
}
