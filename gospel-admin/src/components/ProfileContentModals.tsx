'use client'

import { createPortal } from 'react-dom'
import ScriptureModal from '@/components/ScriptureModal'
import MemorizationPracticeSession from '@/components/MemorizationPracticeSession'
import SpurgeonSermonsModal from '@/components/SpurgeonSermonsModal'
import MorneveDevotionsModal from '@/components/MorneveDevotionsModal'
import McheyneReadingPlanModal from '@/components/McheyneReadingPlanModal'
import BiblePassagePickerModal from '@/components/BiblePassagePickerModal'
import { isBibleBooksMemorizationItem } from '@/lib/bibleBooksMemorization'
import { isVerseBookmarkColorId } from '@/lib/profileContentDomHelpers'
import type { VersePinColorId } from '@/lib/versePinStorage'
import {
  clearMemorizationInProgress,
  loadMemorizedVerses,
  saveMemorizationInProgress,
  updatePracticeStats,
} from '@/lib/verseMemorizationStorage'
import type { ProfileContentModalsProps } from '@/lib/profileContentModalTypes'

export type { ProfileContentModalsProps } from '@/lib/profileContentModalTypes'
export type {
  ProfileContentScriptureModalCluster,
  ProfileContentStudyModalsCluster,
} from '@/lib/profileContentModalTypes'

export default function ProfileContentModals({ scripture, study }: ProfileContentModalsProps) {
  const {
    profileSlug,
    profileTitle,
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
    onOpenSpurgeonStudy,
  } = scripture

  const { spurgeon, morneve, mcheyne, bibleReader, memorizationPractice, onDismissScriptureAndPractice } =
    study

  return (
    <>
      <ScriptureModal
        reference={activeScripture.reference}
        isOpen={activeScripture.isOpen}
        profileSlug={profileSlug}
        profileTitle={profileTitle}
        scriptureTabAnchors={
          effectiveModalOpenAnchors
            ? {
                sectionId: effectiveModalOpenAnchors.sectionId,
                subsectionId: effectiveModalOpenAnchors.subsectionId,
              }
            : undefined
        }
        mcheyneDayChapterReferences={mcheyneDayListenReferences}
        onMcheynePlaylistChapterSync={syncMcheynePlaylistChapter}
        initialChapterView={activeScripture.initialChapterView ?? false}
        onClose={closeModal}
        onScriptureTabActivate={(entry) => {
          void openScriptureFromTabEntry(entry)
        }}
        onScriptureTabCloseActive={(next) => {
          if (!next) {
            closeModal()
            return
          }
          void openScriptureFromTabEntry(next)
        }}
        onNavigateReference={navigateScriptureInReader}
        onPassagePickerOpen={clearMcheynePlanCardPinSession}
        onPrevious={hasPrevious ? navigateToPrevious : undefined}
        onNext={hasNext ? navigateToNext : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        presentationLocation={scriptureModalPresentationLocation}
        {...(scriptureModalHighlightPicker
          ? {
              scriptureHighlightControl: {
                highlightsRevision: highlightRevision,
                profileSlug,
                onChanged: bumpHighlights,
              },
            }
          : {
              versePinControl: {
                draftColor: modalPinDraftColor,
                onDraftColorChange: (color: VersePinColorId) => {
                  if (modalPinSyncedKey && isVerseBookmarkColorId(color)) {
                    setModalPinUserOverride({ key: modalPinSyncedKey, color })
                  }
                },
                colorsAvailableInDropdown: modalPinDropdownColors,
              },
            })}
        onOpenSpurgeonStudy={onOpenSpurgeonStudy}
      />

      <SpurgeonSermonsModal
        isOpen={spurgeon.isOpen}
        modalTitle={spurgeon.modalTitle}
        libraryFocus={spurgeon.libraryFocus}
        initialByReference={spurgeon.initialByReference}
        onFollowSermonLink={onDismissScriptureAndPractice}
        onClose={spurgeon.onClose}
        onOpenScriptureReference={spurgeon.onOpenScriptureReference}
      />

      <MorneveDevotionsModal
        isOpen={morneve.isOpen}
        onFollowDayLink={onDismissScriptureAndPractice}
        onClose={morneve.onClose}
      />

      <McheyneReadingPlanModal
        isOpen={mcheyne.isOpen}
        onNavigateToPlanDay={mcheyne.navigatePlanDay}
        onNavigateToLatest={mcheyne.navigateLatest}
        onFollowDayLink={onDismissScriptureAndPractice}
        onClose={mcheyne.onClose}
      />

      {typeof document !== 'undefined' && bibleReader.isOpen
        ? createPortal(
            <BiblePassagePickerModal
              isOpen={bibleReader.isOpen}
              onClose={bibleReader.onClose}
              confirmLabel="Read"
              requireVerse={false}
              variant="reader"
              onConfirm={(ref, meta) => {
                bibleReader.onConfirm(ref, meta)
              }}
            />,
            document.body
          )
        : null}

      {typeof document !== 'undefined' && memorizationPractice.verse
        ? createPortal(
            <MemorizationPracticeSession
              verse={memorizationPractice.verse}
              onClose={memorizationPractice.onClose}
              onPersistInProgress={(payload) => {
                saveMemorizationInProgress(memorizationPractice.verse!.id, payload)
              }}
              onClearInProgress={() => {
                clearMemorizationInProgress(memorizationPractice.verse!.id)
                memorizationPractice.onUpdated(
                  loadMemorizedVerses().find((v) => v.id === memorizationPractice.verse!.id) ?? null
                )
              }}
              onComplete={(result) => {
                updatePracticeStats(memorizationPractice.verse!.id, {
                  wrongAttempts: result.wrongAttempts,
                  correctKeystrokes: result.correctKeystrokes,
                  completed: result.completed,
                })
              }}
              {...(!isBibleBooksMemorizationItem(memorizationPractice.verse)
                ? { onOpenSpurgeonStudy }
                : {})}
            />,
            document.body
          )
        : null}
    </>
  )
}
