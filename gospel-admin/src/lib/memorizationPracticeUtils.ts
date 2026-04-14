/** Seeded PRNG (mulberry32). */
export function seedRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Deterministic 32-bit seed from string. */
export function stringToSeed(str: string): number {
  let h = 1779033703
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

export function getWordsForMemorization(plainText: string): string[] {
  return plainText.trim().split(/\s+/).filter(Boolean)
}

/** Round 1 = 20% hidden, … round 5 = 100%. Round 0 = 0%. */
export function hiddenFractionForRound(roundIndex: number): number {
  if (roundIndex <= 0) return 0
  return Math.min(1, roundIndex * 0.2)
}

/** How many practice rounds until 100% hidden (inclusive). */
export const MEMORIZATION_FULL_HIDE_ROUND = 5

/** Unique per practice run so blanked words differ each session (still stable per round within one session). */
export function generateMemorizationSessionSeed(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`
}

export function pickHiddenWordIndices(
  wordCount: number,
  roundIndex: number,
  seedStr: string
): Set<number> {
  const fraction = hiddenFractionForRound(roundIndex)
  if (wordCount === 0 || fraction <= 0) return new Set()
  const target = Math.max(1, Math.round(wordCount * fraction))
  const hideCount = Math.min(wordCount, roundIndex >= MEMORIZATION_FULL_HIDE_ROUND ? wordCount : target)

  const rng = seedRandom(stringToSeed(`${seedStr}-memorize-round-${roundIndex}`))
  const indices = Array.from({ length: wordCount }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return new Set(indices.slice(0, hideCount))
}

/** First alphabetic character for typing match (handles leading punctuation). */
export function firstLetterOfWord(word: string): string {
  const m = word.match(/[A-Za-zÀ-ÿ]/u)
  return m ? m[0].toLowerCase() : ''
}
