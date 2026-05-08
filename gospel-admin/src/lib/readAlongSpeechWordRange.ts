/**
 * Map Web Speech `boundary` events to a **single word** span inside the utterance chunk string.
 *
 * We **do not use `charLength`**: on Chromium it often spans multiple words ahead of audio.
 * We map **`charIndex`** to a whitespace-delimited token, then walk **backward** by
 * {@link READ_ALONG_WORDS_TRAIL_ENGINE_CHAR_INDEX} tokens so the underline tracks heard speech.
 */

import { READ_ALONG_WORDS_TRAIL_ENGINE_CHAR_INDEX } from '@/lib/readAlongBoundaryUiLag'

/** Expand index to the contiguous non-whitespace run (skips leading whitespace from index). */
export function wordExtentAtChunkOffset(
  chunk: string,
  index: number
): { start: number; endExclusive: number } {
  const len = chunk.length
  let i = Math.max(0, Math.min(index, len))
  while (i < len && /\s/.test(chunk.charAt(i))) i += 1
  if (i >= len) return { start: len, endExclusive: len }

  let start = i
  while (start > 0 && /\S/.test(chunk.charAt(start - 1))) start -= 1
  let end = i
  while (end < len && /\S/.test(chunk.charAt(end))) end += 1
  return { start, endExclusive: end }
}

/** Previous whitespace-delimited token strictly before character index `beforeStart`. */
export function wordExtentEndingBefore(chunk: string, beforeStart: number): { start: number; endExclusive: number } | null {
  let i = Math.min(beforeStart, chunk.length) - 1
  while (i >= 0 && /\s/.test(chunk.charAt(i))) i -= 1
  if (i < 0) return null
  const endExclusive = i + 1
  while (i >= 0 && /\S/.test(chunk.charAt(i))) i -= 1
  const start = i + 1
  if (endExclusive <= start) return null
  return { start, endExclusive }
}

/**
 * Word span for highlighting: token containing `charIndex`, shifted earlier by `wordsBehind` tokens.
 */
export function wordRangeTrailingBehindCharIndex(
  chunk: string,
  charIndex: number,
  wordsBehind: number
): { relStart: number; relEndExclusive: number } | null {
  const extAtIndex = wordExtentAtChunkOffset(chunk, Math.max(0, Math.min(charIndex, chunk.length)))
  if (extAtIndex.endExclusive <= extAtIndex.start) return null

  let ext = extAtIndex
  for (let b = 0; b < wordsBehind; b++) {
    const prev = wordExtentEndingBefore(chunk, ext.start)
    if (!prev) break
    ext = prev
  }
  return { relStart: ext.start, relEndExclusive: ext.endExclusive }
}

export function firstWordRangeInChunk(chunk: string): { relStart: number; relEndExclusive: number } | null {
  const m = chunk.match(/\S+/)
  if (!m || m.index === undefined) return null
  return { relStart: m.index, relEndExclusive: m.index + m[0].length }
}

export function currentWordRangeInChunk(
  chunk: string,
  ev: SpeechSynthesisEvent
): { relStart: number; relEndExclusive: number } | null {
  const ci = typeof ev.charIndex === 'number' ? ev.charIndex : 0
  return wordRangeTrailingBehindCharIndex(chunk, ci, READ_ALONG_WORDS_TRAIL_ENGINE_CHAR_INDEX)
}
