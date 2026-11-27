import type { TtsTextChunk } from '@/lib/splitTextForTtsChunks'

export const GROK_LISTEN_CHUNK_MIN_CHARS = 800
export const GROK_LISTEN_CHUNK_MAX_CHARS = 1200

export type ProfileListenChunkMode = 'device' | 'grok'

function hardSplitWords(source: string, maxChars: number): string[] {
  const words = source.split(/\s+/).filter(Boolean)
  if (words.length === 0) return source ? [source.slice(0, maxChars)] : []
  const chunks: string[] = []
  let cur = ''
  const pushWord = (word: string) => {
    if (word.length > maxChars) {
      if (cur) {
        chunks.push(cur)
        cur = ''
      }
      for (let i = 0; i < word.length; i += maxChars) {
        chunks.push(word.slice(i, i + maxChars))
      }
      return
    }
    const next = cur ? `${cur} ${word}` : word
    if (next.length > maxChars && cur) {
      chunks.push(cur)
      cur = word
      return
    }
    cur = next
  }
  for (const word of words) pushWord(word)
  if (cur) chunks.push(cur)
  return chunks
}

function splitSegmentIntoGrokChunks(segment: string): string[] {
  if (!segment) return []
  let sentences = segment.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean)
  if (sentences.length === 0) sentences = [segment]

  const pieces: string[] = []
  for (const sentence of sentences) {
    if (sentence.length <= GROK_LISTEN_CHUNK_MAX_CHARS) {
      pieces.push(sentence)
      continue
    }
    pieces.push(...hardSplitWords(sentence, GROK_LISTEN_CHUNK_MAX_CHARS))
  }

  const chunks: string[] = []
  let cur = ''
  for (const piece of pieces) {
    if (!cur) {
      cur = piece
      continue
    }
    const next = `${cur} ${piece}`
    if (next.length <= GROK_LISTEN_CHUNK_MAX_CHARS) {
      cur = next
      continue
    }
    chunks.push(cur)
    cur = piece
  }
  if (cur) chunks.push(cur)
  return chunks.filter(Boolean)
}

/**
 * Grok passages from the raw listen string. `plainStart` matches collapsed plain text
 * (segments joined by one space). The first chunk of each later segment sets `pauseBefore`.
 */
export function splitListenRawIntoGrokChunksWithOffsets(raw: string): TtsTextChunk[] {
  const segments = raw.split('\n').map((segment) => segment.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const out: TtsTextChunk[] = []
  let globalPlain = 0
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]!
    const parts = splitSegmentIntoGrokChunks(seg)
    let cursor = 0
    for (let pi = 0; pi < parts.length; pi++) {
      const text = parts[pi]!
      let idx = seg.indexOf(text, cursor)
      if (idx < 0) idx = cursor
      out.push({
        text,
        plainStart: globalPlain + idx,
        pauseBefore: si > 0 && pi === 0,
      })
      cursor = idx + text.length
    }
    globalPlain += seg.length
    if (si < segments.length - 1) globalPlain += 1
  }
  return out
}
