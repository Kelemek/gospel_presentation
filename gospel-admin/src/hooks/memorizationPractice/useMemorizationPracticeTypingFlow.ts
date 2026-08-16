'use client'

import { useId, useRef } from 'react'
import type { MemorizationPracticeTypingSlice } from '@/lib/memorizationPracticeSessionContract'
import type { MemorizationPracticeTypingBag } from '@/hooks/memorizationPractice/memorizationPracticeTypingBag'
import { useMemorizationPracticeKeyboardInset } from '@/hooks/memorizationPractice/useMemorizationPracticeKeyboardInset'
import { useMemorizationPracticeTypingHint } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingHint'
import { useMemorizationPracticeTypingScroll } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingScroll'
import { useMemorizationPracticeTypingFocus } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingFocus'
import { useMemorizationPracticeTypingHandlers } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingHandlers'
import { useMemorizationPracticeWordChoices } from '@/hooks/memorizationPractice/useMemorizationPracticeWordChoices'

export type MemorizationPracticeTypingFlowResult = {
  typing: MemorizationPracticeTypingSlice
  keepPracticeInputOnPointerCapture: ReturnType<
    typeof useMemorizationPracticeTypingFocus
  >['keepPracticeInputOnPointerCapture']
}

export function useMemorizationPracticeTypingFlow(
  bag: MemorizationPracticeTypingBag
): MemorizationPracticeTypingFlowResult {
  const practiceInputDomId = useId()
  const verseTouchMovedRef = useRef(false)
  const verseTouchStartRef = useRef({ x: 0, y: 0 })

  const keyboardInsetPx = useMemorizationPracticeKeyboardInset()
  const hint = useMemorizationPracticeTypingHint(bag)
  const focus = useMemorizationPracticeTypingFocus(bag)
  const wordChoiceLabels = useMemorizationPracticeWordChoices(bag, hint)
  useMemorizationPracticeTypingScroll(bag, hint, keyboardInsetPx, wordChoiceLabels.length)
  const handlers = useMemorizationPracticeTypingHandlers(bag, hint)

  return {
    keepPracticeInputOnPointerCapture: focus.keepPracticeInputOnPointerCapture,
    typing: {
      hintActive: hint.hintActive,
      hintPeekIndices: hint.hintPeekIndices,
      currentTargetIndex: hint.currentTargetIndex,
      currentTargetToken: hint.currentTargetToken,
      firstLetterCueHiddenSlots: hint.firstLetterCueHiddenSlots,
      practiceInputDomId,
      verseTouchMovedRef,
      verseTouchStartRef,
      restorePracticeInputFocusAfterHint: focus.restorePracticeInputFocusAfterHint,
      processWordGuess: handlers.processWordGuess,
      handleReorderInvalidDrop: handlers.handleReorderInvalidDrop,
      handleReorderWrongSwap: handlers.handleReorderWrongSwap,
      handleReorderSlotsBecameCorrect: handlers.handleReorderSlotsBecameCorrect,
      wordChoiceLabels,
      handlePracticeInputKeyDown: handlers.handlePracticeInputKeyDown,
      handlePracticeInput: handlers.handlePracticeInput,
      keyboardInsetPx,
      assignPracticeInputRef: bag.assignPracticeInputRef,
      practiceInputRef: bag.practiceInputRef,
      hintButtonRef: bag.hintButtonRef,
      practiceScrollRef: bag.practiceScrollRef,
      firstLetterCuesViewportRef: bag.firstLetterCuesViewportRef,
      practiceWordsWordRef: bag.practiceWordsWordRef,
      practiceWordsTypeRef: bag.practiceWordsTypeRef,
      setHintHeld: bag.setHintHeld,
      setHintPeekCount: bag.setHintPeekCount,
    },
  }
}
