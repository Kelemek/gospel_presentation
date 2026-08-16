'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { isPracticePhaseActiveRound, isPracticePhaseDone } from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import { isKeyboardPracticeMode } from '@/lib/memorizationPracticeSessionHelpers'
import type { MemorizationPracticeCoreState } from '@/hooks/memorizationPractice/useMemorizationPracticeCoreState'

type UseMemorizationPracticeSessionLifecycleOptions = {
  verse: MemorizedVerse
  phase: MemorizationPracticePhase
  core: MemorizationPracticeCoreState
  keepPracticeInputOnPointerCapture: (e: PointerEvent | TouchEvent) => void
  resetIntro: () => void
}

/** Dialog chrome: verse reset, body scroll lock, done-phase scroll reset, hint capture. */
export function useMemorizationPracticeSessionLifecycle({
  verse,
  phase,
  core,
  keepPracticeInputOnPointerCapture,
  resetIntro,
}: UseMemorizationPracticeSessionLifecycleOptions) {
  const {
    practiceMode,
    practiceScrollRef,
    hintButtonRef,
    completedRef,
    roundAdvanceHandledRef,
    sessionSeedRef,
    resetPracticeUiStateForStartOver,
  } = core

  /** Sync reset before paint so deferred transitions cannot race mode-picker start. */
  useLayoutEffect(() => {
    if (verse.inProgressPractice) {
      completedRef.current = false
      return
    }
    completedRef.current = false
    roundAdvanceHandledRef.current = null
    sessionSeedRef.current = ''
    resetIntro()
    resetPracticeUiStateForStartOver()
  }, [
    verse.id,
    verse.inProgressPractice,
    resetIntro,
    completedRef,
    roundAdvanceHandledRef,
    sessionSeedRef,
    resetPracticeUiStateForStartOver,
  ])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.style.overflow = 'unset'
    }
  }, [])

  useLayoutEffect(() => {
    if (!isPracticePhaseDone(phase)) return
    const el = practiceScrollRef.current
    if (!el) return
    el.scrollTop = 0
    window.requestAnimationFrame(() => {
      el.scrollTop = 0
    })
  }, [phase, practiceScrollRef])

  useLayoutEffect(() => {
    if (!isPracticePhaseActiveRound(phase) || !isKeyboardPracticeMode(practiceMode)) return
    const el = hintButtonRef.current
    if (!el) return
    const capture = keepPracticeInputOnPointerCapture
    el.addEventListener('touchstart', capture, { capture: true, passive: false })
    el.addEventListener('pointerdown', capture, { capture: true })
    return () => {
      el.removeEventListener('touchstart', capture, { capture: true })
      el.removeEventListener('pointerdown', capture, { capture: true })
    }
  }, [phase, practiceMode, hintButtonRef, keepPracticeInputOnPointerCapture])
}

export function useMemorizationPracticeAudioResetOnVerseChange(
  verseId: string,
  stopPassageAudio: () => void
) {
  const lastAudioResetVerseIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (lastAudioResetVerseIdRef.current === null) {
      lastAudioResetVerseIdRef.current = verseId
      return
    }
    if (lastAudioResetVerseIdRef.current === verseId) {
      return
    }
    lastAudioResetVerseIdRef.current = verseId
    stopPassageAudio()
  }, [verseId, stopPassageAudio])
}
