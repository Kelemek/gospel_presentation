'use client'

import { useCallback, useState } from 'react'
import {
  STUDY_MODAL_DEFAULT_TITLE,
  type StudyLibraryFocus,
} from '@/components/SpurgeonSermonsModal'
import { resolveScriptureModalTabToRestore } from '@/lib/profileLastOpenResourceStorage'
import { isChapterOnlyScriptureReference } from '@/lib/parse-scripture-reference'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

type OpenScriptureFromTabEntry = (entry: {
  reference: string
  sectionId: string
  subsectionId: string
}) => void | Promise<void>

type NavigateScriptureInReader = (
  ref: string,
  meta?: {
    initialChapterView?: boolean
    fromPassagePicker?: boolean
    anchors?: { sectionId: string; subsectionId: string }
  }
) => void

export type UseProfileStudyModalsOptions = {
  profileSlug: string
  closeMenu: () => void
  closeModal: () => void
  openScriptureFromTabEntry: OpenScriptureFromTabEntry
  navigateScriptureInReader: NavigateScriptureInReader
}

export function useProfileStudyModals({
  profileSlug,
  closeMenu,
  closeModal,
  openScriptureFromTabEntry,
  navigateScriptureInReader,
}: UseProfileStudyModalsOptions) {
  const [isSpurgeonLibraryOpen, setIsSpurgeonLibraryOpen] = useState(false)
  const [isMorneveLibraryOpen, setIsMorneveLibraryOpen] = useState(false)
  const [isMcheynePlanModalOpen, setIsMcheynePlanModalOpen] = useState(false)
  const [bibleReaderOpen, setBibleReaderOpen] = useState(false)
  const [spurgeonStudyReference, setSpurgeonStudyReference] = useState<string | null>(null)
  const [studyModalTitle, setStudyModalTitle] = useState(STUDY_MODAL_DEFAULT_TITLE)
  const [studyLibraryFocus, setStudyLibraryFocus] = useState<StudyLibraryFocus>('all')
  const [memorizationPracticeVerse, setMemorizationPracticeVerse] = useState<MemorizedVerse | null>(
    null
  )

  const openStudyLibrary = useCallback(
    (focus: StudyLibraryFocus, menuTitle?: string, reference?: string | null) => {
      setSpurgeonStudyReference(reference ?? null)
      setStudyModalTitle(menuTitle ?? STUDY_MODAL_DEFAULT_TITLE)
      setStudyLibraryFocus(focus)
      setIsSpurgeonLibraryOpen(true)
    },
    []
  )

  const handleOpenSpurgeonStudy = useCallback(
    (reference: string) => openStudyLibrary('all', STUDY_MODAL_DEFAULT_TITLE, reference),
    [openStudyLibrary]
  )

  const handleCloseSpurgeonLibrary = useCallback(() => {
    setIsSpurgeonLibraryOpen(false)
    setSpurgeonStudyReference(null)
    setStudyModalTitle(STUDY_MODAL_DEFAULT_TITLE)
    setStudyLibraryFocus('all')
  }, [])

  const handleSpurgeonOpenScripture = useCallback(
    (ref: string) => {
      navigateScriptureInReader(ref)
      setIsSpurgeonLibraryOpen(false)
    },
    [navigateScriptureInReader]
  )

  const dismissScriptureAndPractice = useCallback(() => {
    closeModal()
    setMemorizationPracticeVerse(null)
  }, [closeModal])

  const handleOpenScriptureHighlight = useCallback(
    (reference: string) => {
      navigateScriptureInReader(reference, {
        fromPassagePicker: true,
        ...(isChapterOnlyScriptureReference(reference) ? { initialChapterView: true } : {}),
      })
    },
    [navigateScriptureInReader]
  )

  const handleOpenBibleReader = useCallback(() => {
    closeMenu()
    const tab = resolveScriptureModalTabToRestore(profileSlug)
    if (tab) {
      void openScriptureFromTabEntry(tab)
      return
    }
    setBibleReaderOpen(true)
  }, [profileSlug, closeMenu, openScriptureFromTabEntry])

  const handleMemorizationPracticeStart = useCallback(
    (verse: MemorizedVerse) => {
      setMemorizationPracticeVerse(verse)
      closeMenu()
    },
    [closeMenu]
  )

  return {
    isSpurgeonLibraryOpen,
    isMorneveLibraryOpen,
    isMcheynePlanModalOpen,
    bibleReaderOpen,
    spurgeonStudyReference,
    studyModalTitle,
    studyLibraryFocus,
    memorizationPracticeVerse,
    openStudyLibrary,
    handleOpenSpurgeonStudy,
    handleCloseSpurgeonLibrary,
    handleSpurgeonOpenScripture,
    dismissScriptureAndPractice,
    handleOpenScriptureHighlight,
    handleOpenBibleReader,
    handleMemorizationPracticeStart,
    openMorneveLibrary: () => setIsMorneveLibraryOpen(true),
    closeMorneveLibrary: () => setIsMorneveLibraryOpen(false),
    openMcheynePlan: () => setIsMcheynePlanModalOpen(true),
    closeMcheynePlan: () => setIsMcheynePlanModalOpen(false),
    closeBibleReader: () => setBibleReaderOpen(false),
    closeMemorizationPractice: () => setMemorizationPracticeVerse(null),
    updateMemorizationPracticeVerse: setMemorizationPracticeVerse,
  }
}
