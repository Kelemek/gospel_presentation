'use client'

import { useCallback, useState, type ReactNode } from 'react'
import { DailyVerseHuntSuccessContent } from '@/components/DailyVerseHuntSuccessContent'
import { tryCompleteDailyVerseChallenge } from '@/lib/dailyVerseChallenge'
import { capturePostHogEvent } from '@/lib/posthog-analytics'

export function useProfileDailyVerseChallenge(showAlert: (content: ReactNode) => void) {
  const [dailyVerseChallengeVersion, setDailyVerseChallengeVersion] = useState(0)

  const completeDailyVerseChallengeIfMatch = useCallback(
    (openedReference: string) => {
      const completed = tryCompleteDailyVerseChallenge(openedReference)
      if (!completed) return
      setDailyVerseChallengeVersion((v) => v + 1)
      capturePostHogEvent('daily_verse_challenge_completed', {
        prompt_id: completed.prompt.id,
        reference: completed.prompt.reference,
        kind: completed.prompt.kind,
      })
      showAlert(
        <DailyVerseHuntSuccessContent
          variant="modal"
          encouragementMessage={completed.encouragementMessage}
          reference={completed.prompt.reference}
        />
      )
    },
    [showAlert]
  )

  return {
    dailyVerseChallengeVersion,
    completeDailyVerseChallengeIfMatch,
  }
}
