'use client'

import {
  isPracticePhaseDone,
  isPracticePhaseInSession,
} from '@/lib/memorizationPracticePhase'
import { isKeyboardPracticeMode } from '@/lib/memorizationPracticeSessionHelpers'
import type {
  MemorizationPracticeModeSlice,
  MemorizationPracticeReciteSlice,
  MemorizationPracticeRoundSlice,
  MemorizationPracticeTypingSlice,
} from '@/lib/memorizationPracticeSessionContract'
import type { MemorizationPracticeVerseModel } from '@/lib/memorizationPracticeSessionTypes'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import { MemorizationPracticeDonePanel } from '@/components/memorizationPracticeSession/MemorizationPracticeDonePanel'
import { MemorizationPracticeHiddenInput } from '@/components/memorizationPracticeSession/MemorizationPracticeHiddenInput'
import { MemorizationPracticeRoundHeader } from '@/components/memorizationPracticeSession/MemorizationPracticeRoundHeader'
import { MemorizationPracticeFirstLettersCuesPanel } from '@/components/memorizationPracticeSession/MemorizationPracticeFirstLettersCuesPanel'
import { MemorizationPracticeReciteRoundPanel } from '@/components/memorizationPracticeSession/MemorizationPracticeReciteRoundPanel'
import { MemorizationPracticeReorderRoundPanel } from '@/components/memorizationPracticeSession/MemorizationPracticeReorderRoundPanel'
import { MemorizationPracticeWordRoundPanel } from '@/components/memorizationPracticeSession/MemorizationPracticeWordRoundPanel'
import { MemorizationPracticeTypeRoundPanel } from '@/components/memorizationPracticeSession/MemorizationPracticeTypeRoundPanel'

export type MemorizationPracticeActiveRoundPanelProps = {
  verse: MemorizedVerse
  strictMode: boolean
  verseModel: MemorizationPracticeVerseModel
  round: MemorizationPracticeRoundSlice
  mode: Pick<MemorizationPracticeModeSlice, 'practiceMode'>
  recite: MemorizationPracticeReciteSlice
  typing: MemorizationPracticeTypingSlice
  onClose: () => void
}

export function MemorizationPracticeActiveRoundPanel({
  verse,
  strictMode,
  verseModel,
  round,
  mode,
  recite,
  typing,
  onClose,
}: MemorizationPracticeActiveRoundPanelProps) {
  const {
    isBibleBooks,
    tokens,
    typableIndices,
    reorderChunks,
    reorderColonAfterSlotIndex,
    memorizeAndroidHost,
  } = verseModel
  const {
    phase,
    roundIndex,
    isRoundComplete,
    isFinalRound,
    hiddenIndices,
    revealed,
    firstLetterCueRevealedSlots,
    reorderSlotChunkIds,
    setReorderSlotChunkIds,
    reorderRoundMovableIndices,
    wrongAttemptsInRound,
    flashError,
    roundCompletedWithErrors,
    showStrictErrorsBadge,
    roundCompleteInstruction,
    reciteRoundAdvanceHeaderCopy,
  } = round
  const { practiceMode } = mode
  const {
    hintActive,
    hintPeekIndices,
    currentTargetIndex,
    currentTargetToken,
    firstLetterCueHiddenSlots,
    practiceInputDomId,
    practiceWordsWordRef,
    practiceWordsTypeRef,
    verseTouchMovedRef,
    verseTouchStartRef,
    practiceScrollRef,
    firstLetterCuesViewportRef,
    keyboardInsetPx,
    assignPracticeInputRef,
    practiceInputRef,
    handleReorderInvalidDrop,
    handleReorderWrongSwap,
    handleReorderSlotsBecameCorrect,
    handlePracticeInputKeyDown,
    handlePracticeInput,
  } = typing

  const stickyFirstLetters = practiceMode === 'firstLetters' && !isRoundComplete
  const showKeyboardHiddenInput =
    isPracticePhaseInSession(phase) && isKeyboardPracticeMode(practiceMode) && !memorizeAndroidHost

  return (
    <div
      ref={practiceScrollRef}
      className={`relative isolate bg-white dark:bg-slate-800 px-4 pt-0 pb-4 flex-1 min-h-0 overscroll-y-contain touch-pan-y ${
        isPracticePhaseDone(phase)
          ? 'overflow-y-hidden flex flex-col justify-center'
          : 'overflow-y-auto'
      }`}
      style={
        keyboardInsetPx > 0
          ? { paddingBottom: `calc(${keyboardInsetPx}px + 0.5rem)` }
          : undefined
      }
    >
      {showKeyboardHiddenInput && (
        <MemorizationPracticeHiddenInput
          variant="inColumn"
          practiceInputDomId={practiceInputDomId}
          inputRef={assignPracticeInputRef}
          currentTargetToken={currentTargetToken}
          isRoundComplete={isRoundComplete}
          onKeyDown={handlePracticeInputKeyDown}
          onInput={handlePracticeInput}
        />
      )}
      {isPracticePhaseInSession(phase) && practiceMode === 'recite' ? (
        <MemorizationPracticeReciteRoundPanel
          verse={verse}
          strictMode={strictMode}
          verseModel={verseModel}
          phase={phase}
          roundIndex={roundIndex}
          isRoundComplete={isRoundComplete}
          reciteRoundAdvanceHeaderCopy={reciteRoundAdvanceHeaderCopy}
          hiddenIndices={hiddenIndices}
          revealed={revealed}
          hintPeekIndices={hintPeekIndices}
          wrongAttemptsInRound={wrongAttemptsInRound}
          roundCompletedWithErrors={roundCompletedWithErrors}
          isFinalRound={isFinalRound}
          recite={recite}
        />
      ) : isPracticePhaseInSession(phase) ? (
        <div>
          <div
            className={
              stickyFirstLetters
                ? 'sticky top-0 z-20 -mx-4 mb-2 border-b border-slate-200 bg-white px-4 pt-4 pb-2 shadow-[0_6px_12px_-8px_rgba(15,23,42,0.35)] dark:border-slate-600 dark:bg-slate-800 dark:shadow-[0_8px_16px_-10px_rgba(0,0,0,0.65)]'
                : 'pt-4 mb-2'
            }
          >
            <div className={stickyFirstLetters ? 'mb-2' : ''}>
              <MemorizationPracticeRoundHeader
                practiceMode={practiceMode}
                roundIndex={roundIndex}
                roundCompleteInstruction={roundCompleteInstruction}
                reorderChunkCount={reorderChunks.length}
                firstLetterCueHiddenCount={firstLetterCueHiddenSlots.size}
                typableCount={typableIndices.length}
                wrongAttemptsInRound={wrongAttemptsInRound}
                showStrictErrorsBadge={showStrictErrorsBadge}
              />
            </div>
            {stickyFirstLetters && (
              <MemorizationPracticeFirstLettersCuesPanel
                tokens={tokens}
                typableIndices={typableIndices}
                firstLetterCueHiddenSlots={firstLetterCueHiddenSlots}
                firstLetterCueRevealedSlots={firstLetterCueRevealedSlots}
                currentTargetIndex={currentTargetIndex}
                currentTargetToken={currentTargetToken}
                firstLetterCuesViewportRef={firstLetterCuesViewportRef}
              />
            )}
          </div>
          <div className="relative z-0 min-w-0">
            {practiceMode === 'reorder' ? (
              <MemorizationPracticeReorderRoundPanel
                reorderChunks={reorderChunks}
                reorderSlotChunkIds={reorderSlotChunkIds}
                setReorderSlotChunkIds={setReorderSlotChunkIds}
                reorderRoundMovableIndices={reorderRoundMovableIndices}
                onInvalidDrop={handleReorderInvalidDrop}
                onWrongSwap={handleReorderWrongSwap}
                onSlotsBecameCorrect={handleReorderSlotsBecameCorrect}
                flashError={flashError}
                hintActive={hintActive}
                practiceScrollRef={practiceScrollRef}
                reorderColonAfterSlotIndex={reorderColonAfterSlotIndex}
                extraFixedSlotSpacing={isBibleBooks}
              />
            ) : practiceMode === 'word' ? (
              <MemorizationPracticeWordRoundPanel
                tokens={tokens}
                hiddenIndices={hiddenIndices}
                revealed={revealed}
                hintActive={hintActive}
                hintPeekIndices={hintPeekIndices}
                currentTargetIndex={currentTargetIndex}
                currentTargetToken={currentTargetToken}
                flashError={flashError}
                practiceWordsWordRef={practiceWordsWordRef}
              />
            ) : (
              <MemorizationPracticeTypeRoundPanel
                tokens={tokens}
                hiddenIndices={hiddenIndices}
                revealed={revealed}
                hintActive={hintActive}
                hintPeekIndices={hintPeekIndices}
                currentTargetIndex={currentTargetIndex}
                currentTargetToken={currentTargetToken}
                flashError={flashError}
                practiceInputDomId={practiceInputDomId}
                practiceWordsTypeRef={practiceWordsTypeRef}
                practiceInputRef={practiceInputRef}
                verseTouchMovedRef={verseTouchMovedRef}
                verseTouchStartRef={verseTouchStartRef}
                isRoundComplete={isRoundComplete}
              />
            )}
          </div>
        </div>
      ) : null}

      {isPracticePhaseDone(phase) && (
        <MemorizationPracticeDonePanel phase={phase} onClose={onClose} />
      )}
    </div>
  )
}
