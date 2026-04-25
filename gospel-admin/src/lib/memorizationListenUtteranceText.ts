import { buildMemorizationTokens, formatMemorizationTokensPlain } from '@/lib/memorizationPracticeUtils'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

/** Spoken string for the memorization line (verse body + reference), matching the intro / practice tokens. */
export function getMemorizationListenUtteranceText(verse: MemorizedVerse): string {
  return formatMemorizationTokensPlain(buildMemorizationTokens(verse.text, verse.reference))
}
