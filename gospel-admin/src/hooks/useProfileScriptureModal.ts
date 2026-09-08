'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { useRouter } from 'next/navigation'
import type { BibleTranslation } from '@/contexts/TranslationContext'
import { isBibleTranslation } from '@/lib/bible-translations'
import { buildProfileFavoriteScriptureReferences } from '@/lib/buildProfileFavoriteScriptureReferences'
import type { GospelSection } from '@/lib/types'
import type { VersePinsStoredState, VerseBookmarkColorId } from '@/lib/versePinStorage'
import type { ScriptureRefNav, ScriptureModalState } from '@/lib/profileContentDomHelpers'
import { resolveScriptureCardAnchors } from '@/lib/profileContentDomHelpers'
import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import {
  indexOfScriptureCardInList,
  isProfileScriptureCardAnchors,
  scriptureCardReferencesMatch,
  scriptureModalUsesHighlightPicker,
} from '@/lib/scriptureModalOpenMode'
import { isMcheyneProfileSlug } from '@/lib/mcheyne/mcheyneSlug'
import {
  mcheyneDayListenReferencesFromCards,
  mcheyneDayScriptureCardsFromRefs,
  mcheyneDaySubsectionIdFromAnchor,
} from '@/lib/mcheyne/mcheyneReadingDay'
import { isMcheynePlanScriptureCardOpen } from '@/lib/mcheyne/mcheynePlanCardPin'
import { isChapterOnlyScriptureReference } from '@/lib/parse-scripture-reference'
import { presentationLocationFromProfileAnchors } from '@/lib/presentationLocationFromAnchors'
import {
  buildProfileRecentScriptureHref,
  recordScriptureLastOpen,
  type ProfileRecentScriptureEntry,
} from '@/lib/profileLastOpenResourceStorage'
import { useProfileScriptureModalNavigation } from '@/hooks/useProfileScriptureModalNavigation'
import { useProfileScriptureModalPinSession } from '@/hooks/useProfileScriptureModalPinSession'

export type UseProfileScriptureModalOptions = {
  isHydrated: boolean
  sectionCount: number
  profileSlug: string
  profileTitle: string
  sections: GospelSection[]
  allScriptureRefs: ScriptureRefNav[]
  scriptureRefParam: string
  scriptureViewParam: string
  translationParam: string
  translation: BibleTranslation
  enabledTranslations: BibleTranslation[]
  translationsLoading: boolean
  setTranslation: (translation: BibleTranslation) => void | Promise<void>
  versePinMap: VersePinsStoredState
  bumpVersePins: () => void
  persistReadingResumeBeforeLeave: (reason?: string) => void
  completeDailyVerseChallengeIfMatch: (reference: string) => void
  router: ReturnType<typeof useRouter>
}

export function useProfileScriptureModal({
  isHydrated,
  sectionCount,
  profileSlug,
  profileTitle,
  sections,
  allScriptureRefs,
  scriptureRefParam,
  scriptureViewParam,
  translationParam,
  translation,
  enabledTranslations,
  translationsLoading,
  setTranslation,
  versePinMap,
  bumpVersePins,
  persistReadingResumeBeforeLeave,
  completeDailyVerseChallengeIfMatch,
  router,
}: UseProfileScriptureModalOptions) {
  const [selectedScripture, setSelectedScripture] = useState<ScriptureModalState>({
    reference: '',
    isOpen: false,
  })
  const [dismissedScriptureRefParam, setDismissedScriptureRefParam] = useState<string | null>(null)
  const deepLinkTranslationAppliedRef = useRef<string | null>(null)
  const [currentReferenceIndex, setCurrentReferenceIndex] = useState(0)
  const [modalPinUserOverride, setModalPinUserOverride] = useState<{
    key: string
    color: VerseBookmarkColorId
  } | null>(null)
  const [modalOpenAnchors, setModalOpenAnchors] = useState<{
    reference: string
    sectionId: string
    subsectionId: string
  } | null>(null)

  const favoriteReferences = useMemo(
    () => buildProfileFavoriteScriptureReferences(sections),
    [sections]
  )

    const syncModalAnchorsForNav = useCallback(
    (reference: string, explicit?: { sectionId: string; subsectionId: string }) => {
      setModalOpenAnchors(
        resolveScriptureCardAnchors({
          reference,
          sections,
          pinnedAnchors: modalOpenAnchors,
          explicit,
        })
      )
    },
    [sections, modalOpenAnchors]
  )

  const syncNavIndexForReference = useCallback(
    (reference: string, explicit?: { sectionId: string; subsectionId: string }) => {
      syncModalAnchorsForNav(reference, explicit)
      const { sectionId, subsectionId } = resolveScriptureCardAnchors({
        reference,
        sections,
        pinnedAnchors: modalOpenAnchors,
        explicit,
      })
      const anchorLookup =
        sectionId && subsectionId ? { sectionId, subsectionId } : undefined
      const allIndex = indexOfScriptureCardInList(reference, allScriptureRefs, anchorLookup)
      if (allIndex === -1) return

      const hasExplicitAnchors = Boolean(
        explicit?.sectionId?.trim() && explicit?.subsectionId?.trim()
      )
      if (hasExplicitAnchors) {
        setCurrentReferenceIndex(allIndex)
        return
      }

      if (favoriteReferences.length > 0) {
        const favIndex = favoriteReferences.indexOf(reference)
        if (favIndex !== -1) {
          setCurrentReferenceIndex(favIndex)
          return
        }
        if (anchorLookup) {
          setCurrentReferenceIndex(allIndex)
        }
        return
      }

      setCurrentReferenceIndex(allIndex)
    },
    [sections, allScriptureRefs, favoriteReferences, modalOpenAnchors, syncModalAnchorsForNav]
  )

  const handleScriptureClick = useCallback(
    (
      reference: string,
      anchorSectionId?: string,
      anchorSubsectionId?: string,
      options?: { initialChapterView?: boolean; pickerNavigation?: boolean }
    ) => {
      persistReadingResumeBeforeLeave('scripture-open')

      const resolvedAnchors = resolveScriptureCardAnchors({
        reference,
        sections,
        explicit: {
          sectionId: anchorSectionId,
          subsectionId: anchorSubsectionId,
        },
      })
      const { sectionId, subsectionId } = resolvedAnchors

      const anchorLookup =
        sectionId && subsectionId ? { sectionId, subsectionId } : undefined

      const openingMcheynePlanCard =
        !options?.pickerNavigation &&
        isMcheynePlanScriptureCardOpen(
          profileSlug ?? '',
          anchorSectionId,
          anchorSubsectionId
        )

      setModalOpenAnchors(resolvedAnchors)

      if (favoriteReferences.length > 0) {
        const cardIndex = anchorLookup
          ? indexOfScriptureCardInList(reference, allScriptureRefs, anchorLookup)
          : -1
        if (openingMcheynePlanCard && cardIndex !== -1) {
          setCurrentReferenceIndex(cardIndex)
        } else {
          const favIndex = favoriteReferences.indexOf(reference)
          if (favIndex !== -1) setCurrentReferenceIndex(favIndex)
          else if (cardIndex !== -1) setCurrentReferenceIndex(cardIndex)
        }
      } else {
        const allIndex = indexOfScriptureCardInList(reference, allScriptureRefs, anchorLookup)
        if (allIndex !== -1) setCurrentReferenceIndex(allIndex)
      }

      const mcheynePlanCardPin = openingMcheynePlanCard

      const resolvedSectionId = sectionId || 'modal-view'
      const resolvedSubsectionId = subsectionId || 'modal-view'
      const fromScriptureCard = isProfileScriptureCardAnchors(
        reference,
        resolvedSectionId,
        resolvedSubsectionId,
        allScriptureRefs
      )
      const usePickerNavigation = options?.pickerNavigation === true || !fromScriptureCard

      setSelectedScripture({
        reference,
        isOpen: true,
        ...(options?.initialChapterView || isChapterOnlyScriptureReference(reference)
          ? { initialChapterView: true }
          : {}),
        ...(usePickerNavigation
          ? { pickerNavigation: true as const, mcheynePlanCardPin: undefined }
          : { pickerNavigation: undefined }),
        ...(mcheynePlanCardPin && !usePickerNavigation
          ? { mcheynePlanCardPin: true as const }
          : {}),
      })
      completeDailyVerseChallengeIfMatch(reference)
    },
    [
      sections,
      allScriptureRefs,
      favoriteReferences,
      profileSlug,
      persistReadingResumeBeforeLeave,
      completeDailyVerseChallengeIfMatch,
    ]
  )

  const clearMcheynePlanCardPinSession = useCallback(() => {
    setSelectedScripture((prev) =>
      prev.mcheynePlanCardPin === true
        ? { ...prev, mcheynePlanCardPin: undefined }
        : prev
    )
  }, [])

  const navigateScriptureInReader = useCallback(
    (
      ref: string,
      meta?: {
        initialChapterView?: boolean
        fromPassagePicker?: boolean
        anchors?: { sectionId: string; subsectionId: string }
      }
    ) => {
      const chapterView =
        meta?.initialChapterView === true ||
        (meta?.initialChapterView !== false && isChapterOnlyScriptureReference(ref))
      if (meta?.fromPassagePicker) {
        setModalOpenAnchors({
          reference: ref,
          sectionId: 'modal-view',
          subsectionId: 'modal-view',
        })
      } else {
        syncNavIndexForReference(ref, meta?.anchors)
      }
      setSelectedScripture((prev) => {
        const pickerNavigation =
          meta?.fromPassagePicker === true || prev.pickerNavigation === true
        return {
          ...prev,
          reference: ref,
          isOpen: true,
          ...(pickerNavigation
            ? { pickerNavigation: true as const, mcheynePlanCardPin: undefined }
            : { pickerNavigation: undefined }),
          ...(chapterView ? { initialChapterView: true as const } : { initialChapterView: undefined }),
        }
      })
      completeDailyVerseChallengeIfMatch(ref)
    },
    [syncNavIndexForReference, completeDailyVerseChallengeIfMatch]
  )

  const deepLinkTranslation = useMemo((): BibleTranslation | null => {
    if (!translationParam || !isBibleTranslation(translationParam)) return null
    return translationParam
  }, [translationParam])

  const scriptureFromDeepLink = useMemo((): ScriptureModalState | null => {
    if (!isHydrated || sectionCount === 0 || !profileSlug || !scriptureRefParam) return null
    if (dismissedScriptureRefParam === scriptureRefParam) return null
    if (deepLinkTranslation && translationsLoading) return null
    return {
      reference: scriptureRefParam,
      isOpen: true,
      ...(scriptureViewParam === 'chapter' || isChapterOnlyScriptureReference(scriptureRefParam)
        ? { initialChapterView: true }
        : {}),
    }
  }, [
    isHydrated,
    sectionCount,
    profileSlug,
    scriptureRefParam,
    scriptureViewParam,
    dismissedScriptureRefParam,
    deepLinkTranslation,
    translationsLoading,
  ])

  const activeScripture =
    selectedScripture.isOpen ? selectedScripture : (scriptureFromDeepLink ?? selectedScripture)

  const deepLinkModalAnchors = useMemo(() => {
    if (!scriptureRefParam || !sections) return null
    const found = findFirstScriptureCardAnchors(sections, scriptureRefParam)
    if (found) {
      return {
        reference: scriptureRefParam,
        sectionId: found.sectionId,
        subsectionId: found.subsectionId,
      }
    }
    return {
      reference: scriptureRefParam,
      sectionId: 'modal-view',
      subsectionId: 'modal-view',
    }
  }, [scriptureRefParam, sections])

  const effectiveModalOpenAnchors = useMemo(() => {
    if (
      selectedScripture.isOpen &&
      modalOpenAnchors &&
      scriptureCardReferencesMatch(modalOpenAnchors.reference, selectedScripture.reference)
    ) {
      return modalOpenAnchors
    }
    if (scriptureFromDeepLink && deepLinkModalAnchors) {
      return deepLinkModalAnchors
    }
    return modalOpenAnchors
  }, [
    selectedScripture.isOpen,
    selectedScripture.reference,
    modalOpenAnchors,
    scriptureFromDeepLink,
    deepLinkModalAnchors,
  ])

  const scriptureModalHighlightPicker = useMemo(
    () =>
      scriptureModalUsesHighlightPicker({
        reference: activeScripture.reference,
        pickerNavigation: activeScripture.pickerNavigation,
        anchors:
          effectiveModalOpenAnchors &&
          scriptureCardReferencesMatch(
            effectiveModalOpenAnchors.reference,
            activeScripture.reference
          )
            ? effectiveModalOpenAnchors
            : null,
        scriptureCards: allScriptureRefs,
      }),
    [
      activeScripture.reference,
      activeScripture.pickerNavigation,
      effectiveModalOpenAnchors,
      allScriptureRefs,
    ]
  )

  const useMcheynePlanCardNav = useMemo(
    () => activeScripture.isOpen && activeScripture.mcheynePlanCardPin === true,
    [activeScripture.isOpen, activeScripture.mcheynePlanCardPin]
  )

  useEffect(() => {
    if (!profileSlug || !activeScripture.isOpen) return
    const reference = activeScripture.reference.trim()
    if (!reference) return

    const anchorsMatch =
      effectiveModalOpenAnchors &&
      scriptureCardReferencesMatch(effectiveModalOpenAnchors.reference, reference)
    let sectionId = anchorsMatch ? (effectiveModalOpenAnchors?.sectionId?.trim() ?? '') : ''
    let subsectionId = anchorsMatch
      ? (effectiveModalOpenAnchors?.subsectionId?.trim() ?? '')
      : ''
    if (!sectionId || !subsectionId) {
      const found = sections ? findFirstScriptureCardAnchors(sections, reference) : null
      if (found) {
        sectionId = found.sectionId
        subsectionId = found.subsectionId
      } else {
        sectionId = 'modal-view'
        subsectionId = 'modal-view'
      }
    }

    const chapterView =
      activeScripture.initialChapterView === true ||
      isChapterOnlyScriptureReference(reference)

    recordScriptureLastOpen({
      slug: profileSlug,
      profileTitle: profileTitle ?? profileSlug,
      reference,
      sectionId,
      subsectionId,
      ...(chapterView ? { chapterView: true } : {}),
      translation,
    })
  }, [
    activeScripture.isOpen,
    activeScripture.reference,
    activeScripture.initialChapterView,
    profileSlug,
    profileTitle,
    effectiveModalOpenAnchors,
    sections,
    translation,
  ])

  const mcheyneDayListenSubsectionId = effectiveModalOpenAnchors?.subsectionId?.trim() || ''

  const syncMcheynePlaylistChapter = useCallback(
    (playlistIndex: number) => {
      const daySubsectionId = mcheyneDaySubsectionIdFromAnchor(mcheyneDayListenSubsectionId)
      if (!daySubsectionId) return
      const dayCards = mcheyneDayScriptureCardsFromRefs(allScriptureRefs, daySubsectionId)
      const card = dayCards[playlistIndex]
      if (!card) return
      navigateScriptureInReader(card.reference, {
        ...(!isChapterOnlyScriptureReference(card.reference)
          ? { initialChapterView: false as const }
          : {}),
        anchors: { sectionId: card.sectionId, subsectionId: card.subsectionId },
      })
    },
    [allScriptureRefs, mcheyneDayListenSubsectionId, navigateScriptureInReader]
  )

  const mcheyneDayListenReferences = useMemo(() => {
    if (!profileSlug || !isMcheyneProfileSlug(profileSlug)) return undefined
    if (!mcheyneDayListenSubsectionId) return undefined
    return (
      mcheyneDayListenReferencesFromCards(allScriptureRefs, mcheyneDayListenSubsectionId) ??
      undefined
    )
  }, [profileSlug, mcheyneDayListenSubsectionId, allScriptureRefs])

  const deepLinkNavIndex = useMemo(() => {
    if (!scriptureFromDeepLink) return null
    const reference = scriptureRefParam
    if (favoriteReferences.length > 0) {
      const favIndex = favoriteReferences.indexOf(reference)
      if (favIndex !== -1) return favIndex
    }
    const allIndex = indexOfScriptureCardInList(reference, allScriptureRefs)
    return allIndex !== -1 ? allIndex : null
  }, [scriptureFromDeepLink, scriptureRefParam, favoriteReferences, allScriptureRefs])

  const navReferenceIndex =
    selectedScripture.isOpen || deepLinkNavIndex === null
      ? currentReferenceIndex
      : deepLinkNavIndex

  useEffect(() => {
    if (!scriptureFromDeepLink || !deepLinkTranslation) return
    if (!enabledTranslations.includes(deepLinkTranslation)) return
    const token = `${scriptureRefParam}|${deepLinkTranslation}`
    if (deepLinkTranslationAppliedRef.current === token) return
    deepLinkTranslationAppliedRef.current = token
    void setTranslation(deepLinkTranslation)
  }, [
    scriptureFromDeepLink,
    deepLinkTranslation,
    enabledTranslations,
    scriptureRefParam,
    setTranslation,
  ])

  const navListLength = useMcheynePlanCardNav
    ? allScriptureRefs.length
    : favoriteReferences.length > 0
      ? favoriteReferences.length
      : allScriptureRefs.length

  const { hasPrevious, hasNext, navigateToPrevious, navigateToNext } =
    useProfileScriptureModalNavigation({
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
    })

  const {
    modalPinDraftColor,
    modalPinSyncedKey,
    modalPinDropdownColors,
    clearPinSessionOnModalClose,
    persistPinOnModalClose,
  } = useProfileScriptureModalPinSession({
    profileSlug,
    sections,
    activeScripture,
    scriptureModalHighlightPicker,
    effectiveModalOpenAnchors,
    versePinMap,
    bumpVersePins,
    modalPinUserOverride,
    setModalPinUserOverride,
  })

  /** “Where you are” in the profile when the scripture modal is open (pinned anchors + nav index). */
  const scriptureModalPresentationLocation = useMemo(() => {
    if (!activeScripture.isOpen) return undefined
    const refStr = activeScripture.reference.trim()
    if (!refStr) return undefined
    const snap = effectiveModalOpenAnchors
    if (!snap || snap.reference !== refStr) return undefined
    if (
      snap.sectionId === 'modal-view' ||
      snap.subsectionId === 'modal-view' ||
      !snap.sectionId?.trim() ||
      !snap.subsectionId?.trim()
    ) {
      return undefined
    }
    const entry = allScriptureRefs.find(
      (r) =>
        r.reference === refStr &&
        r.sectionId === snap.sectionId &&
        r.subsectionId === snap.subsectionId
    )
    if (entry) {
      return {
        sectionTitle: entry.sectionTitle,
        subsectionTitle: entry.subsectionTitle,
        ...(entry.nestedSubsectionTitle
          ? { nestedSubsectionTitle: entry.nestedSubsectionTitle }
          : {}),
      }
    }

    return (
      presentationLocationFromProfileAnchors(sections, snap.sectionId, snap.subsectionId) ??
      undefined
    )
  }, [
    activeScripture.isOpen,
    activeScripture.reference,
    allScriptureRefs,
    sections,
    effectiveModalOpenAnchors,
  ])

  const closeModal = () => {
    persistPinOnModalClose(activeScripture.reference)
    clearPinSessionOnModalClose()
    setModalOpenAnchors(null)
    if (scriptureFromDeepLink && scriptureRefParam) {
      setDismissedScriptureRefParam(scriptureRefParam)
    }
    setSelectedScripture({ reference: '', isOpen: false })
  }

  const openScriptureFromTabEntry = useCallback(
    (entry: ProfileRecentScriptureEntry) => {
      // Do not await setTranslation: state updates synchronously, but await waits on API
      // sync while the passage reference is still the previous tab — recordScriptureModalTab
      // would persist the wrong translation on the tab being left.
      if (
        entry.translation &&
        isBibleTranslation(entry.translation) &&
        enabledTranslations.includes(entry.translation)
      ) {
        void setTranslation(entry.translation)
      }
      if (entry.slug.trim() !== profileSlug.trim()) {
        router.push(buildProfileRecentScriptureHref(entry), { scroll: false })
        return
      }
      const wantChapterView =
        entry.chapterView === true || isChapterOnlyScriptureReference(entry.reference)
      syncNavIndexForReference(entry.reference, {
        sectionId: entry.sectionId,
        subsectionId: entry.subsectionId,
      })
      setModalOpenAnchors({
        reference: entry.reference,
        sectionId: entry.sectionId,
        subsectionId: entry.subsectionId,
      })
      const fromScriptureCard = isProfileScriptureCardAnchors(
        entry.reference,
        entry.sectionId,
        entry.subsectionId,
        allScriptureRefs
      )
      setSelectedScripture({
        reference: entry.reference,
        isOpen: true,
        initialChapterView: wantChapterView,
        ...(fromScriptureCard
          ? {}
          : { pickerNavigation: true as const, mcheynePlanCardPin: undefined }),
      })
    },
    [profileSlug, router, enabledTranslations, setTranslation, syncNavIndexForReference, allScriptureRefs]
  )

  return {
    selectedScriptureIsOpen: selectedScripture.isOpen,
    activeScripture,
    effectiveModalOpenAnchors,
    scriptureModalHighlightPicker,
    scriptureModalPresentationLocation,
    mcheyneDayListenReferences,
    syncMcheynePlaylistChapter,
    modalPinDraftColor,
    modalPinSyncedKey,
    modalPinDropdownColors,
    setModalPinUserOverride,
    handleScriptureClick,
    navigateScriptureInReader,
    clearMcheynePlanCardPinSession,
    closeModal,
    openScriptureFromTabEntry,
    hasPrevious,
    hasNext,
    navigateToPrevious,
    navigateToNext,
  }
}
