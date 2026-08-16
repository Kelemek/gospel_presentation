'use client'

import { usePostHogModalMount } from '@/hooks/usePostHogModalOpen'
import { useMemorizationStrictMode } from '@/hooks/useMemorizationStrictMode'
import type { MemorizationPracticeSessionProps } from '@/lib/memorizationPracticeSessionTypes'
import type { MemorizationPracticeSessionState } from '@/lib/memorizationPracticeSessionContract'
import { useMemorizationPracticeRoundFlow } from '@/hooks/memorizationPractice/useMemorizationPracticeRoundFlow'

export type { MemorizationPracticeSessionState }

export function useMemorizationPracticeSession(
  props: MemorizationPracticeSessionProps
): MemorizationPracticeSessionState {
  const [strictMode] = useMemorizationStrictMode()
  const session = useMemorizationPracticeRoundFlow({ ...props, strictMode })
  usePostHogModalMount('memorize_practice', {
    memorization_kind: session.verseModel.isBibleBooks ? 'bible_books' : 'verse',
    reference: props.verse.reference,
  })
  return session
}
