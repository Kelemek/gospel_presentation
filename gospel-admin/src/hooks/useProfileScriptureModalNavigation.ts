'use client'

import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react'
import { findScriptureCardInList } from '@/lib/scriptureModalOpenMode'
import {
  adjacentPickerPassage,
  pickerAdjacentOpensInChapterView,
  pickerPassageHasNext,
  pickerPassageHasPrevious,
} from '@/lib/biblePassagePickerNavigation'
import type { ScriptureRefNav, ScriptureModalState } from '@/lib/profileContentDomHelpers'

export type ModalOpenAnchors = {
  reference: string
  sectionId: string
  subsectionId: string
}

export type UseProfileScriptureModalNavigationOptions = {
  activeScripture: ScriptureModalState
  scriptureModalHighlightPicker: boolean
  useMcheynePlanCardNav: boolean
  favoriteReferences: string[]
  allScriptureRefs: ScriptureRefNav[]
  navListLength: number
  navReferenceIndex: number
  completeDailyVerseChallengeIfMatch: (reference: string) => void
  syncModalAnchorsForNav: (
    reference: string,
    explicit?: { sectionId: string; subsectionId: string }
  ) => void
  setModalOpenAnchors: (anchors: ModalOpenAnchors) => void
  setSelectedScripture: Dispatch<SetStateAction<ScriptureModalState>>
  setCurrentReferenceIndex: Dispatch<SetStateAction<number>>
}

export function useProfileScriptureModalNavigation({
  activeScripture,
  scriptureModalHighlightPicker,
  useMcheynePlanCardNav,
  favoriteReferences,
  allScriptureRefs,
  navListLength,
  navReferenceIndex,
  completeDailyVerseChallengeIfMatch,
  syncModalAnchorsForNav,
  setModalOpenAnchors,
  setSelectedScripture,
  setCurrentReferenceIndex,
}: UseProfileScriptureModalNavigationOptions) {
  const navigatePickerPassage = useCallback(
    (direction: 'prev' | 'next') => {
      const ref = activeScripture.reference.trim()
      if (!ref) return
      const adjacent = adjacentPickerPassage(ref, direction)
      if (!adjacent) return
      const initialChapterView = pickerAdjacentOpensInChapterView(adjacent)
      setModalOpenAnchors({
        reference: adjacent.reference,
        sectionId: 'modal-view',
        subsectionId: 'modal-view',
      })
      setSelectedScripture({
        reference: adjacent.reference,
        isOpen: true,
        pickerNavigation: true,
        mcheynePlanCardPin: undefined,
        ...(initialChapterView ? { initialChapterView: true as const } : {}),
      })
      completeDailyVerseChallengeIfMatch(adjacent.reference)
    },
    [
      activeScripture.reference,
      completeDailyVerseChallengeIfMatch,
      setModalOpenAnchors,
      setSelectedScripture,
    ]
  )

  const navigateToNextProfileScriptureCard = useCallback(() => {
    if (scriptureModalHighlightPicker) {
      navigatePickerPassage('next')
      return
    }
    if (allScriptureRefs.length === 0) return

    const newIndex = (navReferenceIndex + 1) % allScriptureRefs.length
    setCurrentReferenceIndex(newIndex)
    const item = allScriptureRefs[newIndex]!
    syncModalAnchorsForNav(item.reference, {
      sectionId: item.sectionId,
      subsectionId: item.subsectionId,
    })
    setSelectedScripture({
      reference: item.reference,
      isOpen: true,
      ...(activeScripture.mcheynePlanCardPin ? { mcheynePlanCardPin: true as const } : {}),
    })
  }, [
    scriptureModalHighlightPicker,
    activeScripture.mcheynePlanCardPin,
    navReferenceIndex,
    allScriptureRefs,
    syncModalAnchorsForNav,
    navigatePickerPassage,
    setCurrentReferenceIndex,
    setSelectedScripture,
  ])

  const navigateToPrevious = useCallback(() => {
    if (scriptureModalHighlightPicker) {
      navigatePickerPassage('prev')
      return
    }
    if (navListLength === 0) return

    if (!useMcheynePlanCardNav && favoriteReferences.length > 0) {
      const newIndex = (navReferenceIndex - 1 + navListLength) % navListLength
      setCurrentReferenceIndex(newIndex)
      const reference = favoriteReferences[newIndex]!
      const entry = findScriptureCardInList(reference, allScriptureRefs)
      syncModalAnchorsForNav(
        reference,
        entry ? { sectionId: entry.sectionId, subsectionId: entry.subsectionId } : undefined
      )
      setSelectedScripture({
        reference,
        isOpen: true,
        ...(activeScripture.mcheynePlanCardPin ? { mcheynePlanCardPin: true as const } : {}),
      })
      return
    }

    const newIndex = (navReferenceIndex - 1 + allScriptureRefs.length) % allScriptureRefs.length
    setCurrentReferenceIndex(newIndex)
    const item = allScriptureRefs[newIndex]!
    syncModalAnchorsForNav(item.reference, {
      sectionId: item.sectionId,
      subsectionId: item.subsectionId,
    })
    setSelectedScripture({
      reference: item.reference,
      isOpen: true,
      ...(activeScripture.mcheynePlanCardPin ? { mcheynePlanCardPin: true as const } : {}),
    })
  }, [
    scriptureModalHighlightPicker,
    activeScripture.mcheynePlanCardPin,
    useMcheynePlanCardNav,
    favoriteReferences,
    navListLength,
    navReferenceIndex,
    allScriptureRefs,
    syncModalAnchorsForNav,
    navigatePickerPassage,
    setCurrentReferenceIndex,
    setSelectedScripture,
  ])

  const navigateToNext = useCallback(() => {
    if (scriptureModalHighlightPicker) {
      navigatePickerPassage('next')
      return
    }
    if (navListLength === 0) return

    if (!useMcheynePlanCardNav && favoriteReferences.length > 0) {
      const newIndex = (navReferenceIndex + 1) % navListLength
      setCurrentReferenceIndex(newIndex)
      const reference = favoriteReferences[newIndex]!
      const entry = findScriptureCardInList(reference, allScriptureRefs)
      syncModalAnchorsForNav(
        reference,
        entry ? { sectionId: entry.sectionId, subsectionId: entry.subsectionId } : undefined
      )
      setSelectedScripture({
        reference,
        isOpen: true,
        ...(activeScripture.mcheynePlanCardPin ? { mcheynePlanCardPin: true as const } : {}),
      })
      return
    }

    navigateToNextProfileScriptureCard()
  }, [
    scriptureModalHighlightPicker,
    activeScripture.mcheynePlanCardPin,
    useMcheynePlanCardNav,
    favoriteReferences,
    navListLength,
    navReferenceIndex,
    allScriptureRefs,
    syncModalAnchorsForNav,
    navigatePickerPassage,
    navigateToNextProfileScriptureCard,
    setCurrentReferenceIndex,
    setSelectedScripture,
  ])

  const pickerNavRef = activeScripture.isOpen ? activeScripture.reference.trim() : ''
  const hasPrevious = scriptureModalHighlightPicker
    ? pickerPassageHasPrevious(pickerNavRef)
    : navListLength > 1
  const hasNext = scriptureModalHighlightPicker
    ? pickerPassageHasNext(pickerNavRef)
    : navListLength > 1

  useEffect(() => {
    if (!activeScripture.isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        navigateToPrevious()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        navigateToNext()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeScripture.isOpen, navigateToPrevious, navigateToNext])

  return useMemo(
    () => ({
      hasPrevious,
      hasNext,
      navigateToPrevious,
      navigateToNext,
    }),
    [hasPrevious, hasNext, navigateToPrevious, navigateToNext]
  )
}
