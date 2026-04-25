/**
 * Parse whole-number English phrases (e.g. "twenty three" → 23, "one hundred three" → 103).
 * Used for voice memorization of reference numbers as a single value.
 * Requires the subarray to parse completely with no unused words.
 */

const SMALL: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
}

const TIES: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}

const SMALL_NAMES = new Set(Object.keys(SMALL))
const TIES_NAMES = new Set(Object.keys(TIES))

/**
 * Read 0–99 starting at i; return value and next index, or null.
 */
function parse0to99(words: string[], i: number): { v: number; i: number } | null {
  if (i >= words.length) return null
  const w0 = words[i]!
  if (TIES_NAMES.has(w0)) {
    const base = TIES[w0]!
    if (i + 1 < words.length) {
      const w1 = words[i + 1]!
      if (['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'].includes(w1)) {
        return { v: base + SMALL[w1]!, i: i + 2 }
      }
    }
    return { v: base, i: i + 1 }
  }
  if (SMALL_NAMES.has(w0)) {
    return { v: SMALL[w0]!, i: i + 1 }
  }
  return null
}

/**
 * Read 0–999 starting at i.
 */
function parse0to999(words: string[], i: number): { v: number; i: number } | null {
  if (i >= words.length) return null
  if (
    i + 1 < words.length &&
    SMALL_NAMES.has(words[i]!) &&
    !TIES_NAMES.has(words[i]!) &&
    (words[i + 1] === 'hundred' || words[i + 1] === 'hundreds')
  ) {
    const h = SMALL[words[i]!]!
    if (h < 1 || h > 9) return null
    let j = i + 2
    if (j < words.length && words[j] === 'and') j += 1
    if (j >= words.length) {
      return { v: h * 100, i: j }
    }
    const rest = parse0to99(words, j)
    if (rest) return { v: h * 100 + rest.v, i: rest.i }
    return { v: h * 100, i: j }
  }
  return parse0to99(words, i)
}

/**
 * Read 0–999999: optional thousands, then 0–999.
 */
function parse0to999999(words: string[], i: number): { v: number; i: number } | null {
  if (i >= words.length) return null
  if (
    i + 1 < words.length &&
    SMALL[words[i]!] !== undefined &&
    !TIES_NAMES.has(words[i]!) &&
    (words[i + 1] === 'thousand' || words[i + 1] === 'thousands')
  ) {
    const t = SMALL[words[i]!]!
    if (t < 1 || t > 99) return null
    const j = i + 2
    if (j >= words.length) return { v: t * 1000, i: j }
    const under = parse0to999(words, j)
    if (under) return { v: t * 1000 + under.v, i: under.i }
    return null
  }
  return parse0to999(words, i)
}

/**
 * If `words` (already normalized, lowercase) is a valid single English number phrase,
 * return its value; else null. Must use every element.
 */
export function tryParseEntireArrayAsEnglishInt(words: string[]): number | null {
  if (words.length === 0) return null
  const r = parse0to999999(words, 0)
  if (!r) return null
  if (r.i !== words.length) return null
  return r.v
}
