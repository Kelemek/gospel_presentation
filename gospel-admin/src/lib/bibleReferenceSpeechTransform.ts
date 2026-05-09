/**
 * Profile read-aloud: Web Speech often reads `3:16` as a clock time. Expand **chapter:verse** (and
 * **chapter:verse–verse** ranges) for {@link SpeechSynthesisUtterance} only: single verses stay
 * `N verse M` (digits); ranges use **` to `** between verse spans (e.g. `44:6-7a` → `44 verse 6 to 7a`)
 * so `6-7` is not heard as a measurement. Hyphen-minus, **en dash** (`U+2013`), and **em dash**
 * (`U+2014`) between verses are accepted. **Numbered books** (`1`/`2`/`3` before Samuel, Kings, …)
 * are spoken as **first** / **second** / **third**. A parallel index map keeps read-along aligned
 * with **display** plain text.
 */

/** Hyphen / en dash / em dash — must match {@link VERSE_RANGE_SEP}. */
const VERSE_RANGE_SEP = /[\-\u2013\u2014]/

/** Verse number with optional partial suffix (`7a`, `10b`). */
const VERSE_TOKEN = String.raw`\d{1,3}(?:[a-zA-Z]{1,2})?`

/** Chapter 1–999, verse (optional letter suffix), optional end verse for a range. */
const CHAPTER_VERSE_RANGE = new RegExp(
  String.raw`\b([1-9]\d{0,2}):(${VERSE_TOKEN})(?:${VERSE_RANGE_SEP.source}(${VERSE_TOKEN}))?\b`,
  'g'
)

/** `1` / `2` / `3` before these book names → first / second / third (case-insensitive book match). */
const NUMBERED_BOOK_TAIL =
  'Samuel|Kings|Chronicles|Corinthians|Thessalonians|Timothy|Peter|John'

const NUMBERED_BOOK_ORDINAL = new RegExp(
  String.raw`\b([123])\s+(${NUMBERED_BOOK_TAIL})\b`,
  'gi'
)

const ORDINAL_WORD: Record<'1' | '2' | '3', string> = {
  '1': 'first',
  '2': 'second',
  '3': 'third',
}

export type BibleReferenceSpeakChunk = {
  /** Text passed to {@link SpeechSynthesisUtterance}. */
  speakText: string
  /**
   * Same length as `speakText`; each entry is a 0-based index into the **display** chunk string
   * for the character that should drive read-along for that spoken character.
   */
  speakCharToDisplayCharIndex: number[]
}

type Span =
  | { kind: 'book'; start: number; end: number; digit: '1' | '2' | '3'; digitDisp: number }
  | {
      kind: 'cv'
      start: number
      end: number
      chap: string
      ver: string
      verEnd: string | undefined
    }

function collectSpans(displayChunk: string): Span[] {
  const spans: Span[] = []

  const bookRe = new RegExp(NUMBERED_BOOK_ORDINAL.source, NUMBERED_BOOK_ORDINAL.flags)
  let bm: RegExpExecArray | null
  while ((bm = bookRe.exec(displayChunk))) {
    const digit = bm[1] as '1' | '2' | '3'
    spans.push({
      kind: 'book',
      start: bm.index,
      end: bm.index + bm[0].length,
      digit,
      digitDisp: bm.index,
    })
  }

  const cvRe = new RegExp(CHAPTER_VERSE_RANGE.source, CHAPTER_VERSE_RANGE.flags)
  let cm: RegExpExecArray | null
  while ((cm = cvRe.exec(displayChunk))) {
    spans.push({
      kind: 'cv',
      start: cm.index,
      end: cm.index + cm[0].length,
      chap: cm[1]!,
      ver: cm[2]!,
      verEnd: cm[3],
    })
  }

  spans.sort((a, b) => a.start - b.start || b.end - a.end)
  const merged: Span[] = []
  let lastEnd = -1
  for (const s of spans) {
    if (s.start < lastEnd) continue
    merged.push(s)
    lastEnd = s.end
  }
  return merged
}

/**
 * Build spoken text for one TTS chunk plus per-character mapping back to **display** chunk indices.
 * When there is no chapter:verse pattern, returns identity mapping.
 */
export function buildBibleReferenceSpeakChunk(displayChunk: string): BibleReferenceSpeakChunk {
  const speakChars: string[] = []
  const map: number[] = []
  const spans = collectSpans(displayChunk)
  let cursor = 0

  const pushIdentity = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      speakChars.push(displayChunk[i]!)
      map.push(i)
    }
  }

  for (const sp of spans) {
    pushIdentity(cursor, sp.start)

    if (sp.kind === 'book') {
      const word = ORDINAL_WORD[sp.digit]
      for (let i = 0; i < word.length; i++) {
        speakChars.push(word[i]!)
        map.push(sp.digitDisp)
      }
      for (let i = sp.digitDisp + 1; i < sp.end; i++) {
        speakChars.push(displayChunk[i]!)
        map.push(i)
      }
    } else {
      const { start, end, chap, ver, verEnd } = sp
      const colonDisp = start + chap.length
      const dashDisp = start + chap.length + 1 + ver.length

      for (let j = 0; j < chap.length; j++) {
        speakChars.push(displayChunk[start + j]!)
        map.push(start + j)
      }

      const verseSep = ' verse '
      for (let k = 0; k < verseSep.length; k++) {
        speakChars.push(verseSep[k]!)
        map.push(colonDisp)
      }

      const verDispStart = start + chap.length + 1

      if (verEnd) {
        const sepLen = end - dashDisp - verEnd.length
        const verEndDispStart = dashDisp + sepLen
        for (let j = 0; j < ver.length; j++) {
          speakChars.push(displayChunk[verDispStart + j]!)
          map.push(verDispStart + j)
        }
        const rangeSep = ' to '
        for (let k = 0; k < rangeSep.length; k++) {
          speakChars.push(rangeSep[k]!)
          map.push(dashDisp)
        }
        for (let j = 0; j < verEnd.length; j++) {
          speakChars.push(displayChunk[verEndDispStart + j]!)
          map.push(verEndDispStart + j)
        }
      } else {
        for (let j = 0; j < ver.length; j++) {
          speakChars.push(displayChunk[verDispStart + j]!)
          map.push(verDispStart + j)
        }
      }
    }

    cursor = sp.end
  }

  pushIdentity(cursor, displayChunk.length)

  return {
    speakText: speakChars.join(''),
    speakCharToDisplayCharIndex: map,
  }
}

/** Map a code-unit index in the **spoken** chunk to a code-unit index in the **display** chunk. */
export function displayCharIndexInChunkForSpeakIndex(
  speakIndex: number,
  speakCharToDisplayCharIndex: number[],
  displayChunkLength: number
): number {
  if (displayChunkLength <= 0) return 0
  if (speakCharToDisplayCharIndex.length === 0) return Math.min(speakIndex, displayChunkLength - 1)
  const clamped = Math.max(0, Math.min(speakIndex, speakCharToDisplayCharIndex.length - 1))
  return Math.max(0, Math.min(displayChunkLength - 1, speakCharToDisplayCharIndex[clamped]!))
}

/** Map a half-open speak range to a half-open display range within the same chunk (both 0-based). */
export function displayCharRangeInChunkForSpeakRange(
  speakStart: number,
  speakEndExclusive: number,
  speakCharToDisplayCharIndex: number[],
  displayChunkLength: number
): { displayStart: number; displayEndExclusive: number } {
  if (displayChunkLength <= 0) return { displayStart: 0, displayEndExclusive: 0 }
  const sm = speakCharToDisplayCharIndex
  if (sm.length === 0) {
    const a = Math.max(0, Math.min(speakStart, displayChunkLength))
    const b = Math.max(a, Math.min(speakEndExclusive, displayChunkLength))
    return { displayStart: a, displayEndExclusive: b }
  }
  let dMin = displayChunkLength
  let dMax = -1
  const lo = Math.max(0, speakStart)
  const hi = Math.min(speakEndExclusive, sm.length)
  for (let si = lo; si < hi; si++) {
    const d = sm[si]!
    if (d < dMin) dMin = d
    if (d > dMax) dMax = d
  }
  if (dMax < 0) {
    const d = displayCharIndexInChunkForSpeakIndex(lo, sm, displayChunkLength)
    return { displayStart: d, displayEndExclusive: Math.min(displayChunkLength, d + 1) }
  }
  return { displayStart: dMin, displayEndExclusive: Math.min(displayChunkLength, dMax + 1) }
}
