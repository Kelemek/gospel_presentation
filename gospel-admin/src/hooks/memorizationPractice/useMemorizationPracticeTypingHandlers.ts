'use client'

import {
  useCallback,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { applyMemorizationTypableGuess } from '@/lib/memorizationPracticeTypableGuess'
import {
  isPracticePhaseInSession,
} from '@/lib/memorizationPracticePhase'
import {
  cueSlotToRevealAfterCorrectTypable,
  isPracticeKeystrokeCorrect,
  isValidPracticeKeystrokeForToken,
} from '@/lib/memorizationPracticeKeystroke'
import type { MemorizationPracticeTypingBag } from '@/hooks/memorizationPractice/memorizationPracticeTypingBag'
import type { MemorizationPracticeTypingHintState } from '@/hooks/memorizationPractice/useMemorizationPracticeTypingHint'

export function useMemorizationPracticeTypingHandlers(
  bag: MemorizationPracticeTypingBag,
  hint: MemorizationPracticeTypingHintState
) {
  const {
    verseModel,
    phase,
    practiceModeRef,
    strictMode,
    setHasTypedInRound,
    setRevealed,
    setFirstLetterCueRevealedSlots,
    setConsecutiveWrong,
    setCorrectKeystrokesTotal,
    recordWrongAttempt,
    flashErrorBriefly,
    strictModeRef,
    suppressInputFromKeydownRef,
  } = bag
  const { tokens, typableIndices } = verseModel
  const {
    hintActive,
    currentTargetIndex,
    firstLetterCueHiddenSlotsRef,
  } = hint

  const revealCueForToken = useCallback(
    (tokenIndex: number) => {
      const slot = cueSlotToRevealAfterCorrectTypable(
        practiceModeRef.current,
        tokenIndex,
        typableIndices,
        firstLetterCueHiddenSlotsRef.current
      )
      if (slot === null) return
      setFirstLetterCueRevealedSlots((prev) => {
        if (prev.has(slot)) return prev
        const next = new Set(prev)
        next.add(slot)
        return next
      })
    },
    [
      practiceModeRef,
      typableIndices,
      firstLetterCueHiddenSlotsRef,
      setFirstLetterCueRevealedSlots,
    ]
  )

  const processWordGuess = useCallback(
    (picked: string) => {
      if (hintActive) return
      if (!isPracticePhaseInSession(phase) || currentTargetIndex === null) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return

      setHasTypedInRound(true)
      applyMemorizationTypableGuess(
        currentTargetIndex,
        picked === token.text,
        strictMode,
        {
          setRevealed,
          setConsecutiveWrong,
          setCorrectKeystrokesTotal,
          recordWrongAttempt,
          flashErrorBriefly,
        }
      )
    },
    [
      phase,
      currentTargetIndex,
      tokens,
      hintActive,
      strictMode,
      setHasTypedInRound,
      setRevealed,
      setConsecutiveWrong,
      setCorrectKeystrokesTotal,
      recordWrongAttempt,
      flashErrorBriefly,
    ]
  )

  const processKeystroke = useCallback(
    (key: string) => {
      if (hintActive) return
      if (!isPracticePhaseInSession(phase) || currentTargetIndex === null) return
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return
      if (!isValidPracticeKeystrokeForToken(key, token)) return

      setHasTypedInRound(true)
      applyMemorizationTypableGuess(
        currentTargetIndex,
        isPracticeKeystrokeCorrect(key, token),
        strictMode,
        {
          setRevealed,
          setConsecutiveWrong,
          setCorrectKeystrokesTotal,
          recordWrongAttempt,
          flashErrorBriefly,
        },
        () => revealCueForToken(currentTargetIndex)
      )
    },
    [
      phase,
      currentTargetIndex,
      tokens,
      hintActive,
      strictMode,
      setHasTypedInRound,
      setRevealed,
      setConsecutiveWrong,
      setCorrectKeystrokesTotal,
      recordWrongAttempt,
      flashErrorBriefly,
      revealCueForToken,
    ]
  )

  const handlePracticeInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (hintActive) return
      if (!isPracticePhaseInSession(phase) || currentTargetIndex === null) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const key = e.key
      const token = tokens[currentTargetIndex]
      if (!token || token.kind === 'punct') return
      if (!isValidPracticeKeystrokeForToken(key, token)) return
      e.preventDefault()
      suppressInputFromKeydownRef.current = true
      processKeystroke(key)
      window.setTimeout(() => {
        suppressInputFromKeydownRef.current = false
      }, 0)
    },
    [phase, currentTargetIndex, hintActive, processKeystroke, tokens, suppressInputFromKeydownRef]
  )

  const handlePracticeInput = useCallback(
    (e: FormEvent<HTMLInputElement>) => {
      if (suppressInputFromKeydownRef.current) {
        e.currentTarget.value = ''
        return
      }
      if (hintActive) {
        e.currentTarget.value = ''
        return
      }
      if (!isPracticePhaseInSession(phase) || currentTargetIndex === null) {
        e.currentTarget.value = ''
        return
      }
      const el = e.currentTarget
      const v = el.value
      if (v.length === 0) return
      const last = v.slice(-1)
      el.value = ''
      const token = tokens[currentTargetIndex] ?? null
      if (!token || token.kind === 'punct') return
      if (!isValidPracticeKeystrokeForToken(last, token)) return
      processKeystroke(last)
    },
    [
      phase,
      currentTargetIndex,
      hintActive,
      processKeystroke,
      tokens,
      suppressInputFromKeydownRef,
    ]
  )

  const handleReorderInvalidDrop = useCallback(() => {
    recordWrongAttempt()
    flashErrorBriefly()
  }, [recordWrongAttempt, flashErrorBriefly])

  const handleReorderWrongSwap = useCallback(() => {
    if (!strictModeRef.current) return
    recordWrongAttempt()
    flashErrorBriefly()
  }, [recordWrongAttempt, flashErrorBriefly, strictModeRef])

  const handleReorderSlotsBecameCorrect = useCallback((slots: number[]) => {
    if (slots.length === 0) return
    setCorrectKeystrokesTotal((c) => c + slots.length)
  }, [setCorrectKeystrokesTotal])

  return {
    processWordGuess,
    handlePracticeInputKeyDown,
    handlePracticeInput,
    handleReorderInvalidDrop,
    handleReorderWrongSwap,
    handleReorderSlotsBecameCorrect,
  }
}
