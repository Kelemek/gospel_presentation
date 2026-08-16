'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMemorizePracticeListen } from '@/hooks/useMemorizePracticeListen'
import { isGospelListenSpeechAvailable } from '@/lib/gospelListenSpeechEngine'
import { studyResourcesAvailableFromPayload } from '@/lib/studyResourcesAvailability'
import { canShowPracticeListen, isPracticePhaseIntro } from '@/lib/memorizationPracticePhase'
import type { MemorizationPracticePhase } from '@/lib/memorizationPracticePhase'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'
import type { SpurgeonStudyMatch } from '@/lib/memorizationPracticeSessionTypes'

export type UseMemorizationPracticeListenStudyOptions = {
  verse: MemorizedVerse
  isBibleBooks: boolean
  phase: MemorizationPracticePhase
  isRoundComplete: boolean
  onOpenSpurgeonStudy?: (reference: string) => void
}

type SpurgeonStudyFetchState = {
  reference: string
  result: 'yes' | 'no'
}

export function useMemorizationPracticeListenStudy({
  verse,
  isBibleBooks,
  phase,
  isRoundComplete,
  onOpenSpurgeonStudy,
}: UseMemorizationPracticeListenStudyOptions) {
  const listenViaEsvPassageUrl = !isBibleBooks && verse.translation === 'esv'

  const memorizePassageAudioUrl = useMemo(
    () =>
      `/api/scripture/audio?${new URLSearchParams({
        reference: verse.reference,
        translation: verse.translation,
      }).toString()}`,
    [verse.reference, verse.translation]
  )

  const translationListenEnabled = useMemo(
    () => listenViaEsvPassageUrl || isGospelListenSpeechAvailable(),
    [listenViaEsvPassageUrl]
  )

  const listenInteractionAllowed = useMemo(
    () => translationListenEnabled && canShowPracticeListen(phase),
    [translationListenEnabled, phase]
  )

  const shouldStopListen = useMemo(
    () => isRoundComplete || !isPracticePhaseIntro(phase),
    [isRoundComplete, phase]
  )

  const listen = useMemorizePracticeListen({
    verse,
    verseId: verse.id,
    listenViaEsvPassageUrl,
    memorizePassageAudioUrl,
    listenInteractionAllowed,
    shouldStopListen,
  })

  const shouldLoadSpurgeonStudy =
    !isBibleBooks && !!onOpenSpurgeonStudy && !!verse.reference.trim()

  const studyReference = shouldLoadSpurgeonStudy ? verse.reference.trim() : ''

  const [spurgeonStudyFetch, setSpurgeonStudyFetch] = useState<SpurgeonStudyFetchState | null>(
    null
  )

  const spurgeonStudyMatch: SpurgeonStudyMatch = !shouldLoadSpurgeonStudy
    ? 'unset'
    : spurgeonStudyFetch?.reference === studyReference
      ? spurgeonStudyFetch.result
      : 'loading'

  useEffect(() => {
    if (!studyReference) return
    let cancelled = false
    void fetch(
      `/api/scripture/spurgeon-links?reference=${encodeURIComponent(studyReference)}`,
      { cache: 'no-store' }
    )
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => ({}))
        if (cancelled) return
        const payload = data as {
          items?: unknown
          sermonCount?: number
          edwardsCount?: number
          morneveCount?: number
          calvinCount?: number
          henryCount?: number
          bookCount?: number
          crossRefCount?: number
        }
        setSpurgeonStudyFetch({
          reference: studyReference,
          result: studyResourcesAvailableFromPayload(payload) ? 'yes' : 'no',
        })
      })
      .catch(() => {
        if (!cancelled) {
          setSpurgeonStudyFetch({ reference: studyReference, result: 'no' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [studyReference])

  return {
    listenViaEsvPassageUrl,
    listenInteractionAllowed,
    spurgeonStudyMatch,
    ...listen,
  }
}
