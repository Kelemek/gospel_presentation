'use client'

import { useCallback, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react'
import type { GospelSection } from '@/lib/types'
import {
  assignVersePin,
  assignYellowLastViewed,
  availablePinColorsForModalChoice,
  type VersePinColorId,
  type VersePinsStoredState,
  type VersePinSlotEntry,
  type VerseBookmarkColorId,
  shouldAdvanceYellowLastViewed,
  versePinColorForPassage,
} from '@/lib/versePinStorage'
import { findFirstScriptureCardAnchors } from '@/lib/findFirstScriptureCardAnchors'
import { isVerseBookmarkColorId, versePinSlotEntryFromModalPinKey } from '@/lib/profileContentDomHelpers'
import type { ScriptureModalState } from '@/lib/profileContentDomHelpers'
import { shouldUpdateMcheyneReadingProgress } from '@/lib/mcheyne/mcheynePlanCardPin'
import type { ModalOpenAnchors } from '@/hooks/useProfileScriptureModalNavigation'

export type UseProfileScriptureModalPinSessionOptions = {
  profileSlug: string
  sections: GospelSection[]
  activeScripture: ScriptureModalState
  scriptureModalHighlightPicker: boolean
  effectiveModalOpenAnchors: ModalOpenAnchors | null
  versePinMap: VersePinsStoredState
  bumpVersePins: () => void
  modalPinUserOverride: { key: string; color: VerseBookmarkColorId } | null
  setModalPinUserOverride: Dispatch<
    SetStateAction<{ key: string; color: VerseBookmarkColorId } | null>
  >
}

export function useProfileScriptureModalPinSession({
  profileSlug,
  sections,
  activeScripture,
  scriptureModalHighlightPicker,
  effectiveModalOpenAnchors,
  versePinMap,
  bumpVersePins,
  modalPinUserOverride,
  setModalPinUserOverride,
}: UseProfileScriptureModalPinSessionOptions) {
  const modalPassageAnchorsForPins: VersePinSlotEntry | null = useMemo(() => {
    if (!activeScripture.isOpen || !activeScripture.reference.trim()) return null
    const refStr = activeScripture.reference
    const snap = effectiveModalOpenAnchors
    if (
      snap?.reference === refStr &&
      snap.sectionId?.trim() !== '' &&
      snap.subsectionId?.trim() !== ''
    ) {
      return {
        reference: refStr,
        sectionId: snap.sectionId,
        subsectionId: snap.subsectionId,
      }
    }
    const found = findFirstScriptureCardAnchors(sections, refStr)
    if (found) {
      return {
        reference: refStr,
        sectionId: found.sectionId,
        subsectionId: found.subsectionId,
      }
    }
    return { reference: refStr, sectionId: '', subsectionId: '' }
  }, [activeScripture.isOpen, activeScripture.reference, sections, effectiveModalOpenAnchors])

  const modalPinSyncedKey =
    activeScripture.isOpen && modalPassageAnchorsForPins?.reference
      ? `${modalPassageAnchorsForPins.reference}|${modalPassageAnchorsForPins.sectionId}|${modalPassageAnchorsForPins.subsectionId}`
      : null

  const defaultModalPinColor = useMemo((): VersePinColorId => {
    if (!modalPassageAnchorsForPins?.reference) return 'yellow'
    return versePinColorForPassage(versePinMap, modalPassageAnchorsForPins) ?? 'yellow'
  }, [modalPassageAnchorsForPins, versePinMap])

  const modalPinDraftColor: VersePinColorId =
    modalPinSyncedKey && modalPinUserOverride?.key === modalPinSyncedKey
      ? modalPinUserOverride.color
      : defaultModalPinColor

  const modalPinDropdownColors = useMemo(
    () =>
      modalPassageAnchorsForPins
        ? availablePinColorsForModalChoice(versePinMap, modalPassageAnchorsForPins)
        : [],
    [versePinMap, modalPassageAnchorsForPins]
  )

  const persistVersePinForModalPassage = useCallback(
    (refTxt: string) => {
      if (!refTxt || !profileSlug) return
      const snap = effectiveModalOpenAnchors
      let sectionId = snap?.reference === refTxt ? (snap.sectionId?.trim() ?? '') : ''
      let subsectionId = snap?.reference === refTxt ? (snap.subsectionId?.trim() ?? '') : ''
      if (!sectionId || !subsectionId) {
        const found = findFirstScriptureCardAnchors(sections, refTxt)
        if (found) {
          sectionId = found.sectionId
          subsectionId = found.subsectionId
        }
      }
      const entry: VersePinSlotEntry = {
        reference: refTxt,
        sectionId: sectionId || 'modal-view',
        subsectionId: subsectionId || 'modal-view',
      }
      const bookmarkTint =
        isVerseBookmarkColorId(modalPinDraftColor) && modalPinDraftColor !== defaultModalPinColor
          ? modalPinDraftColor
          : null

      if (bookmarkTint) {
        assignVersePin(profileSlug, bookmarkTint, entry)
        bumpVersePins()
      } else if (
        shouldUpdateMcheyneReadingProgress(profileSlug, activeScripture.mcheynePlanCardPin) &&
        shouldAdvanceYellowLastViewed(versePinMap, entry)
      ) {
        assignYellowLastViewed(profileSlug, entry)
        bumpVersePins()
      }
    },
    [
      profileSlug,
      effectiveModalOpenAnchors,
      sections,
      modalPinDraftColor,
      defaultModalPinColor,
      versePinMap,
      bumpVersePins,
      activeScripture.mcheynePlanCardPin,
    ]
  )

  const lastPersistedModalPinKeyRef = useRef<string | null>(null)
  const pendingBookmarkOverrideByPinKeyRef = useRef<Map<string, VerseBookmarkColorId>>(new Map())

  const flushPendingBookmarkOverrideForPinKey = useCallback(
    (pinKey: string) => {
      if (!profileSlug) return
      const color = pendingBookmarkOverrideByPinKeyRef.current.get(pinKey)
      if (!color) return
      const entry = versePinSlotEntryFromModalPinKey(pinKey)
      if (!entry) return
      assignVersePin(profileSlug, color, entry)
      pendingBookmarkOverrideByPinKeyRef.current.delete(pinKey)
      bumpVersePins()
    },
    [profileSlug, bumpVersePins]
  )

  useEffect(() => {
    if (!modalPinSyncedKey || !modalPinUserOverride) return
    if (modalPinUserOverride.key !== modalPinSyncedKey) return
    if (
      !isVerseBookmarkColorId(modalPinUserOverride.color) ||
      modalPinUserOverride.color === defaultModalPinColor
    ) {
      pendingBookmarkOverrideByPinKeyRef.current.delete(modalPinSyncedKey)
      return
    }
    pendingBookmarkOverrideByPinKeyRef.current.set(modalPinSyncedKey, modalPinUserOverride.color)
  }, [modalPinUserOverride, modalPinSyncedKey, defaultModalPinColor])

  useEffect(() => {
    if (!activeScripture.isOpen || scriptureModalHighlightPicker) {
      lastPersistedModalPinKeyRef.current = null
      pendingBookmarkOverrideByPinKeyRef.current.clear()
      return
    }
    const anchors = modalPassageAnchorsForPins
    if (!anchors?.reference.trim()) return
    const pinKey = `${anchors.reference}|${anchors.sectionId}|${anchors.subsectionId}`
    if (lastPersistedModalPinKeyRef.current === pinKey) return
    const previousPinKey = lastPersistedModalPinKeyRef.current
    if (previousPinKey) {
      flushPendingBookmarkOverrideForPinKey(previousPinKey)
    }
    lastPersistedModalPinKeyRef.current = pinKey
    persistVersePinForModalPassage(anchors.reference.trim())
  }, [
    activeScripture.isOpen,
    modalPassageAnchorsForPins,
    persistVersePinForModalPassage,
    flushPendingBookmarkOverrideForPinKey,
    scriptureModalHighlightPicker,
  ])

  const clearPinSessionOnModalClose = useCallback(() => {
    pendingBookmarkOverrideByPinKeyRef.current.clear()
    setModalPinUserOverride(null)
  }, [setModalPinUserOverride])

  const persistPinOnModalClose = useCallback(
    (reference: string) => {
      if (!scriptureModalHighlightPicker) {
        persistVersePinForModalPassage(reference.trim())
      }
    },
    [scriptureModalHighlightPicker, persistVersePinForModalPassage]
  )

  const scripturePinCommitOnUnmountRef = useRef<{
    isOpen: boolean
    reference: string
    commit: (ref: string) => void
  }>({
    isOpen: false,
    reference: '',
    commit: () => {},
  })

  useEffect(() => {
    scripturePinCommitOnUnmountRef.current = {
      isOpen: activeScripture.isOpen,
      reference: activeScripture.reference,
      commit: persistVersePinForModalPassage,
    }
  }, [activeScripture.isOpen, activeScripture.reference, persistVersePinForModalPassage])

  useEffect(() => {
    return () => {
      const snap = scripturePinCommitOnUnmountRef.current
      if (snap.isOpen && snap.reference.trim()) {
        snap.commit(snap.reference.trim())
      }
    }
  }, [profileSlug])

  return {
    modalPinDraftColor,
    modalPinSyncedKey,
    modalPinDropdownColors,
    persistVersePinForModalPassage,
    clearPinSessionOnModalClose,
    persistPinOnModalClose,
  }
}
