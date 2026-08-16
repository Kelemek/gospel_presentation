'use client'
/* eslint-disable react-hooks/refs -- Session seed ref drives deterministic word choices. */
import { useMemo } from 'react'
import {
  buildMemorizationChoiceLabels,
  seedRandom,
  stringToSeed,
} from '@/lib/memorizationPracticeUtils'
import { isPracticePhaseActiveRound } from '@/lib/memorizationPracticePhase'
import {
  MEMORIZATION_WORD_CHOICE_COUNT_DIGIT,
  MEMORIZATION_WORD_CHOICE_COUNT_WORD,
} from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeTypingBag } from '@/hooks/memorizationPractice/memorizationPracticeTypingBag'
import type { MemorizationPracticeTypingHintState } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingHint'

export function useMemorizationPracticeWordChoices(
  bag: MemorizationPracticeTypingBag,
  hint: Pick<MemorizationPracticeTypingHintState, 'currentTargetIndex'>
) {
  const { verseModel, phase, practiceMode, roundIndex, sessionSeedRef } = bag
  const { tokens, typableIndices } = verseModel
  const { currentTargetIndex } = hint

  return useMemo(() => {
    if (practiceMode !== 'word') return []
    if (!isPracticePhaseActiveRound(phase)) return []
    if (currentTargetIndex === null) return []
    const seed = sessionSeedRef.current
    if (!seed) return []
    const rng = seedRandom(
      stringToSeed(`${seed}-mem-word-r${roundIndex}-t${currentTargetIndex}`)
    )
    const targetTok = tokens[currentTargetIndex] ?? null
    const choiceCount =
      targetTok?.kind === 'digit'
        ? MEMORIZATION_WORD_CHOICE_COUNT_DIGIT
        : MEMORIZATION_WORD_CHOICE_COUNT_WORD
    return buildMemorizationChoiceLabels(
      tokens,
      typableIndices,
      currentTargetIndex,
      choiceCount,
      rng
    )
  }, [practiceMode, phase, currentTargetIndex, roundIndex, tokens, typableIndices, sessionSeedRef])
}
