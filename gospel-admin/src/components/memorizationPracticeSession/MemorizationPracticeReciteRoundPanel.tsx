'use client'

import { MemorizationRecitePractice } from '@/components/MemorizationRecitePractice'
import { isPracticePhaseActiveRound } from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticeReciteSlice } from '@/lib/memorizationPracticeSessionContract'
import type { MemorizationPracticeVerseModel } from '@/lib/memorizationPracticeSessionTypes'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'

export type MemorizationPracticeReciteRoundPanelProps = {
  verse: MemorizedVerse
  strictMode: boolean
  verseModel: Pick<
    MemorizationPracticeVerseModel,
    'tokens' | 'typableIndices' | 'isBibleBooks'
  >
  phase: MemorizationPracticePhase
  roundIndex: number
  isRoundComplete: boolean
  reciteRoundAdvanceHeaderCopy: string | null
  hiddenIndices: Set<number>
  revealed: Set<number>
  hintPeekIndices: Set<number>
  wrongAttemptsInRound: number
  roundCompletedWithErrors: boolean
  isFinalRound: boolean
  recite: MemorizationPracticeReciteSlice
}

export function MemorizationPracticeReciteRoundPanel({
  verse,
  strictMode,
  verseModel,
  phase,
  roundIndex,
  isRoundComplete,
  reciteRoundAdvanceHeaderCopy,
  hiddenIndices,
  revealed,
  hintPeekIndices,
  wrongAttemptsInRound,
  roundCompletedWithErrors,
  isFinalRound,
  recite,
}: MemorizationPracticeReciteRoundPanelProps) {
  const { tokens, typableIndices, isBibleBooks } = verseModel
  const {
    recitePracticeRef,
    setRecitePhase,
    onReciteUiStateChange,
    onReciteClearHint,
    onReciteAttemptMetrics,
  } = recite

  return (
    <MemorizationRecitePractice
      ref={recitePracticeRef}
      active={isPracticePhaseActiveRound(phase)}
      tokens={tokens}
      typableIndices={typableIndices}
      reference={verse.reference}
      translation={verse.translation}
      itemId={verse.id}
      roundIndex={roundIndex}
      awaitingRoundAdvance={isRoundComplete}
      roundAdvanceHeaderCopy={reciteRoundAdvanceHeaderCopy}
      isBibleBooks={isBibleBooks}
      wrongAttemptsInRound={wrongAttemptsInRound}
      roundCompletedWithErrors={roundCompletedWithErrors}
      strictModeEnabled={strictMode}
      isFinalRound={isFinalRound}
      hiddenIndices={hiddenIndices}
      revealed={revealed}
      hintPeekIndices={hintPeekIndices}
      onClearHint={onReciteClearHint}
      onAttemptMetrics={onReciteAttemptMetrics}
      onPhaseChange={setRecitePhase}
      onUiStateChange={onReciteUiStateChange}
    />
  )
}
