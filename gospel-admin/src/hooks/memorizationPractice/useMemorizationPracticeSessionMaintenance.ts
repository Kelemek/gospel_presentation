'use client'

import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticeCoreState } from '@/hooks/memorizationPractice/useMemorizationPracticeCoreState'
import { useMemorizationPracticeInProgressHydration } from '@/hooks/memorizationPractice/useMemorizationPracticeInProgressHydration'
import {
  useMemorizationPracticeAudioResetOnVerseChange,
  useMemorizationPracticeSessionLifecycle,
} from '@/hooks/memorizationPractice/useMemorizationPracticeSessionLifecycle'

type UseMemorizationPracticeSessionMaintenanceOptions = {
  verse: MemorizedVerse
  phase: MemorizationPracticePhase
  reorderChunks: { length: number }
  typableIndices: number[]
  memorizeAndroidHost: boolean
  core: MemorizationPracticeCoreState
  resetIntro: () => void
  hydrateRoundComplete: (roundIndex: number, hadErrors: boolean) => void
  hydrateActiveRound: (roundIndex: number) => void
  keepPracticeInputOnPointerCapture: (e: PointerEvent | TouchEvent) => void
  stopPassageAudio: () => void
}

/** Verse reset, body scroll lock, resume hydrate, and audio reset on verse change. */
export function useMemorizationPracticeSessionMaintenance({
  verse,
  phase,
  reorderChunks,
  typableIndices,
  memorizeAndroidHost,
  core,
  resetIntro,
  hydrateRoundComplete,
  hydrateActiveRound,
  keepPracticeInputOnPointerCapture,
  stopPassageAudio,
}: UseMemorizationPracticeSessionMaintenanceOptions) {
  useMemorizationPracticeSessionLifecycle({
    verse,
    phase,
    core,
    keepPracticeInputOnPointerCapture,
    resetIntro,
  })

  useMemorizationPracticeAudioResetOnVerseChange(verse.id, stopPassageAudio)

  useMemorizationPracticeInProgressHydration({
    verse,
    reorderChunks,
    typableIndices,
    memorizeAndroidHost,
    core,
    hydrateRoundComplete,
    hydrateActiveRound,
  })
}
