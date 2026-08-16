'use client'

import { useCallback, useLayoutEffect } from 'react'
import {
  isPracticePhaseInSession,
  isPracticePhaseRoundComplete,
} from '@/lib/memorizationPracticePhase'
import { isKeyboardPracticeMode } from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeTypingBag } from '@/hooks/memorizationPractice/memorizationPracticeTypingBag'

export function useMemorizationPracticeTypingFocus(bag: MemorizationPracticeTypingBag) {
  const {
    phase,
    phaseRef,
    practiceMode,
    practiceModeRef,
    practiceInputRef,
    practiceWordsTypeRef,
  } = bag

  const keepPracticeInputOnPointerCapture = useCallback(
    (e: PointerEvent | TouchEvent) => {
      if (isPracticePhaseRoundComplete(phaseRef.current)) return
      if (!isKeyboardPracticeMode(practiceModeRef.current)) return
      const t = e.target
      if (t instanceof Element && t.closest('[data-testid="memorize-hint-button"]')) {
        return
      }
      const input = practiceInputRef.current
      if (!input) return
      if (document.activeElement === input) {
        e.preventDefault()
        return
      }
      input.focus({ preventScroll: true })
    },
    [phaseRef, practiceInputRef, practiceModeRef]
  )

  const restorePracticeInputFocusAfterHint = useCallback(() => {
    requestAnimationFrame(() => {
      if (isPracticePhaseRoundComplete(phaseRef.current)) return
      if (!isPracticePhaseInSession(phase)) return
      if (!isKeyboardPracticeMode(practiceModeRef.current)) return
      practiceInputRef.current?.focus({ preventScroll: true })
    })
  }, [phase, phaseRef, practiceInputRef, practiceModeRef])

  useLayoutEffect(() => {
    if (!isPracticePhaseInSession(phase) || !isKeyboardPracticeMode(practiceMode)) return
    const el = practiceWordsTypeRef.current
    if (!el) return
    const onTouchStartCaptureVerse = (e: TouchEvent) => {
      if (isPracticePhaseRoundComplete(phaseRef.current)) return
      const input = practiceInputRef.current
      if (!input) return
      if (document.activeElement === input) {
        e.preventDefault()
      }
    }
    const onPointerDownCapture = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      keepPracticeInputOnPointerCapture(e)
    }
    el.addEventListener('touchstart', onTouchStartCaptureVerse, { capture: true, passive: false })
    el.addEventListener('pointerdown', onPointerDownCapture, { capture: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStartCaptureVerse, { capture: true })
      el.removeEventListener('pointerdown', onPointerDownCapture, { capture: true })
    }
  }, [
    phase,
    practiceMode,
    keepPracticeInputOnPointerCapture,
    phaseRef,
    practiceInputRef,
    practiceWordsTypeRef,
  ])

  return { keepPracticeInputOnPointerCapture, restorePracticeInputFocusAfterHint }
}
