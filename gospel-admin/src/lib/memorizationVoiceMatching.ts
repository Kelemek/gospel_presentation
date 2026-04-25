import { tryParseEntireArrayAsEnglishInt } from '@/lib/memorizationEnglishNumber'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

const DIGIT_ENGLISH: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  oh: '0',
  o: '0',
}

/**
 * On-device STT often mishears a small set of number words. Map before word / English-int matching.
 * (E.g. "twleve" for "twelve" breaks tryParse and leaves digit + spoken "twelve" users stuck on "12" vs word. )
 */
const STT_ENGLISH_NUM_TYPO_MAP: Readonly<Record<string, string>> = {
  twleve: 'twelve',
  elevan: 'eleven',
  thirtee: 'thirty',
  fourty: 'forty',
}

function applySttEnglishNumberWordTypo(w: string): string {
  if (!w) return w
  return STT_ENGLISH_NUM_TYPO_MAP[w] ?? w
}

/**
 * A typable `word` that spells a number: one token ("twelve") or a hyphenated compound
 * ("twenty-three", "one-hundred"). Used when STT says "12" or "23" but the line uses words.
 */
function tryParseWordTypableAsEnglishInt(wordLowercase: string): number | null {
  const t = wordLowercase.trim()
  if (!t) return null
  const parts = t.split(/-+/u).map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) return null
  return tryParseEntireArrayAsEnglishInt(parts)
}

function normalizeSpokenWord(raw: string): string {
  return raw.replace(/^[^\p{L}\p{N}]+/gu, '').replace(/[^\p{L}\p{N}]$/gu, '').toLowerCase()
}

/**
 * On-device STT often omits a single trailing "s" on Bible book names: "Roman" for "Romans",
 * "Galatian" for "Galatians". Without this, "roman" is treated only as a prefix of "romans" and
 * {@link isSttInProgressPrefixOfWord} never advances.
 */
function matchesWordSttDroppingSingleTrailingS(spoken: string, expected: string): boolean {
  if (expected.length < 5) return false
  if (spoken.length + 1 !== expected.length) return false
  if (!expected.endsWith('s') || !expected.startsWith(spoken)) return false
  return spoken.length >= 4
}

/**
 * Splits a recognition transcript into word-like tokens; strips punctuation.
 */
export function tokenizeTranscriptToWords(transcript: string): string[] {
  const t = transcript.trim()
  if (!t) return []
  return t.split(/\s+/u).map(normalizeSpokenWord).filter(Boolean)
}

/**
 * True if a single spoken word matches the expected typable token.
 * For multi-digit reference values (e.g. "23"), use {@link tryMatchVoiceToken} with multiple words.
 */
export function spokenMatchesTypableToken(spoken: string, token: MemorizationToken): boolean {
  if (token.kind === 'punct') return false
  const s = applySttEnglishNumberWordTypo(normalizeSpokenWord(spoken))
  if (!s) return false
  if (token.kind === 'word') {
    const expn = normalizeSpokenWord(token.text)
    if (s === expn) return true
    if (matchesWordSttDroppingSingleTrailingS(s, expn)) return true
    // STT often says "12" when the line has the number written out (e.g. "twelve", "twenty-three"); accept numerals.
    if (/^\d+$/u.test(s)) {
      const n = parseInt(s, 10)
      if (Number.isNaN(n)) return false
      const asName = tryParseWordTypableAsEnglishInt(expn)
      if (asName !== null && asName === n) return true
    }
    return false
  }
  const expected = parseInt(token.text, 10)
  if (Number.isNaN(expected)) return false
  if (s === String(expected) || s === token.text) return true
  const w = s.replace(/[.,]/g, '')
  if (token.text.length === 1) {
    const mapped = DIGIT_ENGLISH[w]
    if (mapped !== undefined) return token.text === mapped
    return false
  }
  const asEnglish = tryParseEntireArrayAsEnglishInt([w])
  return asEnglish === expected
}

/**
 * Match reference numbers that may be spoken with multiple words (e.g. "twenty" "three" for 23),
 * "one" "hundred" "three" for 103, or a single numeric token.
 */
export function tryMatchVoiceToken(
  spokenWords: string[],
  wi: number,
  token: MemorizationToken
): { wordsConsumed: number } | null {
  if (token.kind === 'punct' || token.kind === 'word') {
    if (!spokenWords[wi] || !spokenMatchesTypableToken(spokenWords[wi]!, token)) return null
    return { wordsConsumed: 1 }
  }
  const expected = parseInt(token.text, 10)
  if (Number.isNaN(expected)) return null
  const maxK = Math.min(12, spokenWords.length - wi)
  for (let k = 1; k <= maxK; k += 1) {
    const slice = spokenWords.slice(wi, wi + k)
    const t0 = slice[0]!
    if (k === 1 && /^\d+$/u.test(t0) && parseInt(t0, 10) === expected) {
      return { wordsConsumed: 1 }
    }
    const sliceFixed = slice.map((p) => applySttEnglishNumberWordTypo(p))
    if (tryParseEntireArrayAsEnglishInt(sliceFixed) === expected) {
      return { wordsConsumed: k }
    }
  }
  if (token.text.length === 1 && spokenWords[wi] && spokenMatchesTypableToken(spokenWords[wi]!, token)) {
    return { wordsConsumed: 1 }
  }
  return null
}

/**
 * STT often fuses chapter+verse (or multiple digit typables) into one token, e.g. "8:28" as "828".
 * When the next N consecutive *typable* digit tokens have `text` that concatenates to the spoken
 * number string, expand one array element into N so each {@link tryMatchVoiceToken} can run.
 */
function trySplitFusedDecimalTypablesAt(
  tokens: MemorizationToken[],
  typableIndices: number[],
  step: number,
  spokenWords: string[],
  wi: number
): boolean {
  const w0 = spokenWords[wi]
  if (w0 === undefined || !/^\d+$/u.test(w0)) return false
  if (w0.length <= 1) return false

  const run: string[] = []
  for (let s = step; s < typableIndices.length; s += 1) {
    const t = tokens[typableIndices[s]!]!
    if (t.kind !== 'digit') break
    run.push(t.text)
  }
  if (run.length < 2) return false
  const conc = run.join('')
  if (w0 !== conc) return false
  const segs: string[] = []
  let o = 0
  for (const piece of run) {
    segs.push(w0.slice(o, o + piece.length))
    o += piece.length
  }
  if (o !== w0.length) return false
  if (!segs.every((s, i) => s === run[i]!)) return false
  spokenWords.splice(wi, 1, ...segs)
  return true
}

export const MAX_VOICE_WRONG_BEFORE_REVEAL = 3

/**
 * Very common function words that on-device STT often drops between segments; the next word may
 * still align, so we can advance the skipped slot when the next typable exactly matches the current spoken.
 */
const STT_OMISSION_TYPABLE: ReadonlySet<string> = new Set(['a', 'an', 'the', 'and', 'or', 'of'])

function isOmittableSttFunctionWordToken(token: MemorizationToken): boolean {
  if (token.kind !== 'word') return false
  return STT_OMISSION_TYPABLE.has(normalizeSpokenWord(token.text))
}

/**
 * Partial results often have "create" one tick before "created", or "heaven" before "heavens".
 * Treat as not-yet-final: do not count wrong or flash; wait for the next partial.
 * Do not treat a **short** sub-prefix as in-flight (e.g. "Gene" for "Genesis"): STT may never
 * complete the word in the same run, and holding blocks advance until a new listen session.
 */
function isSttInProgressPrefixOfWord(spoken: string, token: MemorizationToken): boolean {
  if (token.kind !== 'word') return false
  const sp = normalizeSpokenWord(spoken)
  const exp = normalizeSpokenWord(token.text)
  if (sp.length < 2) return false
  if (sp.length >= exp.length) return false
  if (!exp.startsWith(sp)) return false
  const rem = exp.length - sp.length
  if (rem <= 2) return true
  if (rem === 3 && sp.length >= 5) return true
  return false
}

function isPlausibleAttempt(spoken: string, token: MemorizationToken): boolean {
  const w = spoken.trim()
  if (!w) return false
  if (token.kind === 'word') {
    return /[\p{L}]/u.test(w)
  }
  if (token.kind === 'digit') {
    const s = normalizeSpokenWord(w)
    if (!s) return false
    if (/\d/u.test(s)) return true
    if (/[\p{L}]/u.test(s)) return true
    return false
  }
  return false
}

export type VoiceHoldProcessResult = {
  /** New absolute next typable index (0 = first word) */
  nextStep: number
  revealedToAdd: number[]
  wrongAttemptsDelta: number
  correctKeystrokesDelta: number
  nextConsecutiveWrong: number
  shouldFlashError: boolean
}

/**
 * Spoken words vs typable list from `pttStartStep` (voice offset when this listen session started).
 * Idempotent for duplicate partials with the same prefix.
 */
export function processWordsForVoiceHold(params: {
  tokens: MemorizationToken[]
  typableIndices: number[]
  pttStartStep: number
  hiddenIndices: Set<number>
  spokenWords: string[]
  consecutiveWrong: number
}): VoiceHoldProcessResult {
  const { tokens, typableIndices, pttStartStep, hiddenIndices, spokenWords, consecutiveWrong } = params
  if (pttStartStep >= typableIndices.length || spokenWords.length === 0) {
    return {
      nextStep: pttStartStep,
      revealedToAdd: [],
      wrongAttemptsDelta: 0,
      correctKeystrokesDelta: 0,
      nextConsecutiveWrong: consecutiveWrong,
      shouldFlashError: false,
    }
  }

  let step = pttStartStep
  let wi = 0
  let correctDelta = 0
  const revealedToAdd: number[] = []
  let wrongAttemptsDelta = 0
  let consec = consecutiveWrong
  let flash = false
  const pushReveal = (tIdx: number) => {
    if (hiddenIndices.has(tIdx) && !revealedToAdd.includes(tIdx)) {
      revealedToAdd.push(tIdx)
    }
  }

  while (wi < spokenWords.length && step < typableIndices.length) {
    const tIdx = typableIndices[step]!
    const token = tokens[tIdx]!
    // STT often fuses "one ... one" for 1:1 into a single word "11". Expand to one word per
    // digit when that matches a run of same single-digit typable tokens (not e.g. one typable "11").
    if (token.kind === 'digit' && typeof spokenWords[wi] === 'string') {
      const w0 = spokenWords[wi] as string
      if (/^\d+$/u.test(w0) && w0.length > 1) {
        trySplitFusedDecimalTypablesAt(tokens, typableIndices, step, spokenWords, wi)
      }
    }
    if (token.kind === 'digit' && token.text.length === 1) {
      const w0 = spokenWords[wi]!
      const fusion = /^(\d)\1+$/u.exec(w0)
      if (fusion) {
        const d = fusion[1]!
        if (d === token.text) {
          let nSingle = 0
          for (let s2 = step; s2 < typableIndices.length; s2 += 1) {
            const t2 = tokens[typableIndices[s2]!]!
            if (t2.kind !== 'digit' || t2.text.length !== 1 || t2.text !== d) break
            nSingle += 1
          }
          if (nSingle >= 2 && nSingle === w0.length) {
            spokenWords.splice(wi, 1, ...w0.split(''))
          } else if (nSingle === 1 && w0.length > 1) {
            // STT may output "1" then "11" for "1 : 1" (first digit separate, last fused).
            // The nSingle==2 branch would only run when "11" is a single word at the *first* digit
            // step; expand here so each typable "1" can match one character.
            spokenWords.splice(wi, 1, ...w0.split(''))
          }
        }
      }
    }
    const w = spokenWords[wi]!
    const match = tryMatchVoiceToken(spokenWords, wi, token)
    if (match) {
      if (hiddenIndices.has(tIdx)) {
        if (!revealedToAdd.includes(tIdx)) {
          pushReveal(tIdx)
        }
      }
      step += 1
      wi += match.wordsConsumed
      correctDelta += 1
      consec = 0
    } else if (isOmittableSttFunctionWordToken(token) && step + 1 < typableIndices.length) {
      const nextTIdx = typableIndices[step + 1]!
      const nextToken = tokens[nextTIdx]!
      const mNext = tryMatchVoiceToken(spokenWords, wi, nextToken)
      if (mNext) {
        if (hiddenIndices.has(tIdx) && !revealedToAdd.includes(tIdx)) pushReveal(tIdx)
        if (hiddenIndices.has(nextTIdx) && !revealedToAdd.includes(nextTIdx)) pushReveal(nextTIdx)
        step += 2
        wi += mNext.wordsConsumed
        correctDelta += 2
        consec = 0
        continue
      }
      if (isSttInProgressPrefixOfWord(w, token)) {
        return {
          nextStep: step,
          revealedToAdd: [],
          wrongAttemptsDelta: 0,
          correctKeystrokesDelta: 0,
          nextConsecutiveWrong: consec,
          shouldFlashError: false,
        }
      }
      if (!isPlausibleAttempt(w, token)) {
        return {
          nextStep: step,
          revealedToAdd: [],
          wrongAttemptsDelta: 0,
          correctKeystrokesDelta: 0,
          nextConsecutiveWrong: consec,
          shouldFlashError: false,
        }
      }
      wrongAttemptsDelta += 1
      consec += 1
      flash = true
      if (consec >= MAX_VOICE_WRONG_BEFORE_REVEAL) {
        pushReveal(tIdx)
        consec = 0
        break
      }
      break
    } else {
      if (isSttInProgressPrefixOfWord(w, token)) {
        return {
          nextStep: step,
          revealedToAdd: [],
          wrongAttemptsDelta: 0,
          correctKeystrokesDelta: 0,
          nextConsecutiveWrong: consec,
          shouldFlashError: false,
        }
      }
      if (!isPlausibleAttempt(w, token)) {
        return {
          nextStep: step,
          revealedToAdd: [],
          wrongAttemptsDelta: 0,
          correctKeystrokesDelta: 0,
          nextConsecutiveWrong: consec,
          shouldFlashError: false,
        }
      }
      wrongAttemptsDelta += 1
      consec += 1
      flash = true
      if (consec >= MAX_VOICE_WRONG_BEFORE_REVEAL) {
        // Reveal the expected word as a hint; stay on this step until a correct match.
        pushReveal(tIdx)
        consec = 0
        break
      }
      break
    }
  }

  return {
    nextStep: step,
    revealedToAdd: [...new Set(revealedToAdd)],
    wrongAttemptsDelta,
    correctKeystrokesDelta: correctDelta,
    nextConsecutiveWrong: consec,
    shouldFlashError: flash,
  }
}
