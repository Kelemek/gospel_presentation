import { isWhisperReciteSupported } from '@/lib/isWhisperReciteSupported'
import { scriptureReferenceVerseCount } from '@/lib/parse-scripture-reference'
import type { MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'

export const MEMORIZATION_RECITE_PRACTICE_MODE = 'recite' as const satisfies MemorizationPracticeMode

export const RECITE_MAX_VERSES = 5

export function isRecitePracticeMode(
  mode: MemorizationPracticeMode | null | undefined
): mode is typeof MEMORIZATION_RECITE_PRACTICE_MODE {
  return mode === MEMORIZATION_RECITE_PRACTICE_MODE
}

export const RECITE_VERSE_LIMIT_MESSAGE = `Due to transcription limitations, Recite mode only works for passages of up to ${RECITE_MAX_VERSES} verses.`

export function isReciteSupportedScriptureReference(reference: string): boolean {
  const count = scriptureReferenceVerseCount(reference)
  return count !== null && count <= RECITE_MAX_VERSES
}

export function computeReciteModeVisible(options: { isBibleBooks: boolean }): boolean {
  void options
  return isWhisperReciteSupported()
}

export function computeReciteModeAvailable(options: {
  isBibleBooks: boolean
  reference: string
}): boolean {
  return (
    computeReciteModeVisible(options) &&
    (options.isBibleBooks || isReciteSupportedScriptureReference(options.reference))
  )
}
