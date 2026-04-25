import {
  processWordsForVoiceHold,
  tokenizeTranscriptToWords,
  type VoiceHoldProcessResult,
} from '@/lib/memorizationVoiceMatching'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

/** If STT restarts a segment, the new `matches` may be a tail of the verse; try trimming lead words. */
const MAX_SPOKEN_LEADING_TRIM_FOR_REALIGN = 32

export type VoiceReconcileBase = {
  tokens: MemorizationToken[]
  typableIndices: number[]
  pttStartStep: number
  hiddenIndices: Set<number>
  consecutiveWrong: number
}

/**
 * How far along the typable list a transcript would advance (ignores state updates).
 * Spoken array is copied before {@link processWordsForVoiceHold} (it mutates the array for digit split).
 */
export function peekNextStepFromTranscript(base: VoiceReconcileBase, transcript: string): number {
  const spokenWords = tokenizeTranscriptToWords(transcript)
  return processWordsForVoiceHold({
    ...base,
    spokenWords: [...spokenWords],
  }).nextStep
}

export type VoiceHoldBase = {
  tokens: VoiceReconcileBase['tokens']
  typableIndices: VoiceReconcileBase['typableIndices']
  hiddenIndices: VoiceReconcileBase['hiddenIndices']
  consecutiveWrong: number
}

/**
 * After a long line, on-device STT may send a **new** short partial with no common prefix
 * (segment restart) — e.g. only "Steadfastness James…" when the app already had progress at "James 1:1".
 * A single rematch from `pttAtDown` then scores 0 with no way to realign. We also try
 * {@link processWordsForVoiceHold} from `currentVoiceOffset` with up to
 * {@link MAX_SPOKEN_LEADING_TRIM_FOR_REALIGN} words trimmed from the start of the transcript.
 */
export function processWordsForVoiceHoldBestAfterDiverge(
  base: VoiceHoldBase,
  spokenWords: string[],
  pttAtDown: number,
  currentVoiceOffset: number
): VoiceHoldProcessResult {
  const r0 = processWordsForVoiceHold({
    ...base,
    pttStartStep: pttAtDown,
    spokenWords: [...spokenWords],
  })
  if (r0.nextStep >= currentVoiceOffset) {
    return r0
  }
  let best: VoiceHoldProcessResult = r0
  const maxI = Math.min(MAX_SPOKEN_LEADING_TRIM_FOR_REALIGN, spokenWords.length)
  for (let i = 0; i < maxI; i += 1) {
    const tail = spokenWords.slice(i)
    if (tail.length === 0) break
    const r = processWordsForVoiceHold({
      ...base,
      pttStartStep: currentVoiceOffset,
      spokenWords: [...tail],
    })
    if (r.nextStep > best.nextStep) {
      best = r
    }
  }
  return best
}

/**
 * Picks a transcript for matching when STT rewrites the middle of a growing line
 * (e.g. "and" → "in") then appends the reference. Raw longest-by-length can regress
 * {@link processWordsForVoiceHold}’s `nextStep`.
 */
export function selectBestTranscriptForVoiceMatch(
  previousLongest: string,
  newPartial: string,
  base: VoiceReconcileBase
): string {
  const p = previousLongest.trim()
  const n = newPartial.trim()
  if (!p) return n
  if (!n) return p
  if (n.toLowerCase() === p.toLowerCase()) return n.length >= p.length ? n : p

  const pw = tokenizeTranscriptToWords(p)
  const nw = tokenizeTranscriptToWords(n)
  if (nw.length === 0) return p
  if (pw.length === 0) return n

  const minL = Math.min(pw.length, nw.length)
  let k = 0
  while (k < minL && pw[k] === nw[k]) k += 1
  if (k === minL) {
    if (nw.length > pw.length) return n
    if (pw.length > nw.length) return p
    return p.length >= n.length ? p : n
  }

  const a = pw[k]!
  const b = nw[k]!
  if (a !== b) {
    if (b.length > a.length && b.startsWith(a)) {
      return n
    }
    if (a.length > b.length && a.startsWith(b)) {
      return p
    }
  }

  const mergeKeepPrevWord = [...pw.slice(0, k + 1), ...nw.slice(k + 1)].join(' ')

  const candidates: string[] = [n, p, mergeKeepPrevWord]
  const seen = new Set<string>()
  const uniq: string[] = []
  for (const c of candidates) {
    const t = c.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    uniq.push(t)
  }
  if (uniq.length === 0) return n

  const tieOrder = (c: string): number => {
    if (c === mergeKeepPrevWord) return 0
    if (c === p) return 1
    if (c === n) return 2
    return 3
  }

  let best = uniq[0]!
  let bestStep = peekNextStepFromTranscript(base, best)
  let bestOrder = tieOrder(best)
  for (const c of uniq.slice(1)) {
    const s = peekNextStepFromTranscript(base, c)
    const o = tieOrder(c)
    if (s > bestStep) {
      best = c
      bestStep = s
      bestOrder = o
    } else if (s === bestStep) {
      if (o < bestOrder) {
        best = c
        bestOrder = o
      } else if (o === bestOrder) {
        const tw = tokenizeTranscriptToWords(c)
        const bwords = tokenizeTranscriptToWords(best)
        if (tw.length > bwords.length) {
          best = c
        }
      }
    }
  }
  return best
}

/**
 * STT returns a growing (sometimes regressing) full line. Re-matching the entire token list
 * from the PTT start fails once the model inserts wrong words in the middle — the user’s
 * next correct words are never reached. We only feed {@link processWordsForVoiceHold} the
 * **new** tokens after the longest common **prefix** with the last partial (one phrase at
 * a time, in effect).
 */
export function newSpokenWordTokensAfterPrefix(
  previousTokenized: readonly string[] | null,
  currentTokenized: readonly string[]
):
  | {
      kind: 'all'
      /** STT changed a word (e.g. create→created) — re-run the whole line from PTT start, not from current offset. */
      allReason: 'firstPartial' | 'diverged'
      newWords: string[]
      storePrevious: string[]
      shouldProcess: true
    }
  | { kind: 'append'; newWords: string[]; storePrevious: string[]; shouldProcess: true }
  | { kind: 'noNew'; newWords: string[]; storePrevious: string[]; shouldProcess: false } {
  const cur = currentTokenized
  const prev = previousTokenized

  if (cur.length === 0) {
    return { kind: 'noNew', newWords: [], storePrevious: prev ? [...prev] : [], shouldProcess: false }
  }
  if (!prev || prev.length === 0) {
    return {
      kind: 'all',
      allReason: 'firstPartial',
      newWords: [...cur],
      storePrevious: [...cur],
      shouldProcess: true,
    }
  }

  const minL = Math.min(prev.length, cur.length)
  let k = 0
  while (k < minL && prev[k] === cur[k]) k += 1

  if (k === cur.length && cur.length < prev.length) {
    return { kind: 'noNew', newWords: [], storePrevious: [...prev], shouldProcess: false }
  }
  if (k < minL) {
    return { kind: 'all', allReason: 'diverged', newWords: [...cur], storePrevious: [...cur], shouldProcess: true }
  }

  if (cur.length > prev.length) {
    const newWords = cur.slice(k)
    return { kind: 'append', newWords, storePrevious: [...cur], shouldProcess: true }
  }

  if (k === cur.length && k === prev.length) {
    return { kind: 'noNew', newWords: [], storePrevious: [...prev], shouldProcess: false }
  }

  return { kind: 'all', allReason: 'diverged', newWords: [...cur], storePrevious: [...cur], shouldProcess: true }
}
