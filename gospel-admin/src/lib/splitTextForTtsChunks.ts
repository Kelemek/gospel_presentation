/** Soft cap so speed changes mid-section don't replay an entire long subsection. */
const TARGET_MAX_CHUNK_CHARS = 220

function hardSplitWords(s: string, maxChars: number): string[] {
  const words = s.split(/\s+/).filter(Boolean)
  if (words.length === 0) return s ? [s] : []
  const chunks: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      chunks.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) chunks.push(cur)
  return chunks
}

/** Trimmed plain text only. */
function splitTextForTtsChunkStrings(trimmed: string): string[] {
  if (!trimmed) return []

  let parts = trimmed.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) parts = [trimmed]

  const out: string[] = []
  for (const p of parts) {
    if (p.length <= TARGET_MAX_CHUNK_CHARS) {
      out.push(p)
      continue
    }
    const subs = p.split(/(?<=[:;,])\s+/).map((s) => s.trim()).filter(Boolean)
    if (subs.length > 1) {
      out.push(...subs)
      continue
    }
    out.push(...hardSplitWords(p, TARGET_MAX_CHUNK_CHARS))
  }
  return out.filter(Boolean)
}

export type TtsTextChunk = {
  text: string
  plainStart: number
  /** When true, wait briefly before this utterance (listen segment / block boundary). */
  pauseBefore?: boolean
}

/** Chunk index to resume speaking from for a collapsed plain offset (read-along persistence). */
export function chunkIndexContainingPlainOffset(chunks: TtsTextChunk[], plainOffset: number): number {
  if (chunks.length === 0) return 0
  const o = Math.max(0, plainOffset)
  let best = 0
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!
    const start = c.plainStart
    const end = start + c.text.length
    if (o >= start && o < end) return i
    if (start <= o) best = i
  }
  return best
}

/**
 * Same chunks as {@link splitTextForTtsChunks}, plus start index of each chunk in `text.trim()`
 * for mapping read-along scroll position to DOM.
 */
export function splitTextForTtsChunksWithOffsets(text: string): TtsTextChunk[] {
  const t = text.trim()
  const parts = splitTextForTtsChunkStrings(t)
  let cursor = 0
  const out: TtsTextChunk[] = []
  for (const chunk of parts) {
    let idx = t.indexOf(chunk, cursor)
    if (idx < 0) idx = cursor
    out.push({ text: chunk, plainStart: idx })
    cursor = idx + chunk.length
  }
  return out
}

/**
 * Split profile read-aloud plain text into chunks for chained Web Speech utterances.
 */
export function splitTextForTtsChunks(text: string): string[] {
  return splitTextForTtsChunksWithOffsets(text).map((c) => c.text)
}

/**
 * Build profile listen TTS chunks from the raw listen string (`\\n` = implicit block boundary):
 * runs {@link splitTextForTtsChunksWithOffsets} per segment, then **plainStart** in the same space as
 * joining segments with a single space ({@link listenCollapsedPlainFromRaw}). Sets **pauseBefore**
 * on the first chunk of each segment after the first so the caller can delay the next utterance
 * without extra punctuation (keeps Web Speech `charIndex` aligned with audio).
 */
export function splitListenRawIntoTtsChunksWithOffsets(raw: string): TtsTextChunk[] {
  const segments = raw.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const out: TtsTextChunk[] = []
  let globalPlain = 0
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]!
    const parts = splitTextForTtsChunksWithOffsets(seg)
    for (let pi = 0; pi < parts.length; pi++) {
      const p = parts[pi]!
      out.push({
        text: p.text,
        plainStart: globalPlain + p.plainStart,
        pauseBefore: si > 0 && pi === 0,
      })
    }
    globalPlain += seg.length
    if (si < segments.length - 1) globalPlain += 1
  }
  return out
}
