/**
 * Map Web Speech `boundary` events to a **single word** span inside the utterance chunk string.
 * `charLength` is reliable on Chromium; Safari often omits it — we fall back to expanding
 * `charIndex` to a whitespace-delimited token.
 */

const MAX_CHARS_FOR_CHAR_LENGTH_WORD = 64

function readCharLength(ev: SpeechSynthesisEvent): number {
  const raw = (ev as SpeechSynthesisEvent & { charLength?: unknown }).charLength
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0
}

/** Expand index to the contiguous non-whitespace run (skips leading whitespace from index). */
export function wordExtentAtChunkOffset(
  chunk: string,
  index: number
): { start: number; endExclusive: number } {
  const len = chunk.length
  let i = Math.max(0, Math.min(index, len))
  while (i < len && /\s/.test(chunk[i]!)) i += 1
  if (i >= len) return { start: len, endExclusive: len }

  let start = i
  while (start > 0 && /\S/.test(chunk[start - 1]!)) start -= 1
  let end = i
  while (end < len && /\S/.test(chunk[end]!)) end += 1
  return { start, endExclusive: end }
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
  const relStart = Math.max(0, Math.min(ci, chunk.length))
  const cl = readCharLength(ev)

  if (cl > 0 && cl <= MAX_CHARS_FOR_CHAR_LENGTH_WORD) {
    const end = Math.min(chunk.length, relStart + cl)
    if (end > relStart) return { relStart, relEndExclusive: end }
  }

  const ext = wordExtentAtChunkOffset(chunk, relStart)
  if (ext.endExclusive > ext.start) return { relStart: ext.start, relEndExclusive: ext.endExclusive }
  return null
}
