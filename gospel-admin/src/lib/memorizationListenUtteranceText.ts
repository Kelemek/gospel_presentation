import { getWordsForMemorization } from '@/lib/memorizationPracticeUtils'
import type { MemorizedVerse } from '@/lib/verseMemorizationStorage'

function normalizeReferenceForSpeech(ref: string): string {
  return ref
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .trim()
}

/**
 * Text-to-speech phrasing for a stored reference. Screen display stays `verse reference`;
 * TTS would otherwise read "3:16" as a time of day.
 */
export function referenceToSpeechText(reference: string): string {
  const ref = normalizeReferenceForSpeech(reference)
  if (!ref) return ''

  // "… Book 3:16" / "… Book 3:16-20" (greedy book name, last clause is always chapter:verse[–range])
  const withBook = ref.match(
    /^(.+)\s+(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?\s*$/i
  )
  if (withBook) {
    const book = withBook[1]!.trim()
    if (book.length > 0) {
      const ch = withBook[2]!
      const v1 = withBook[3]!
      const v2 = withBook[4]
      return v2
        ? `${book} chapter ${ch}, verses ${v1} through ${v2}`
        : `${book} chapter ${ch}, verse ${v1}`
    }
  }

  // "3:16" or "3:1-2" with no book name
  const chapterOnly = ref.match(/^(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?\s*$/i)
  if (chapterOnly) {
    const ch = chapterOnly[1]!
    const v1 = chapterOnly[2]!
    const v2 = chapterOnly[3]
    return v2
      ? `chapter ${ch}, verses ${v1} through ${v2}`
      : `chapter ${ch}, verse ${v1}`
  }

  // Odd formats: avoid clock times between two numbers
  return ref.replace(/(\d+)\s*:\s*(\d+)/g, 'chapter $1, verse $2')
}

/** Spoken string for the memorization line: verse + TTS-friendly reference (ESV: unused; TTS: non-ESV). */
export function getMemorizationListenUtteranceText(verse: MemorizedVerse): string {
  const body = getWordsForMemorization(verse.text).join(' ')
  const spokenRef = referenceToSpeechText(verse.reference)
  if (!body) return spokenRef
  if (!spokenRef) return body
  return `${body} ${spokenRef}`
}
