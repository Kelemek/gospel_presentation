import { firstLetterOfWord } from '@/lib/memorizationPracticeUtils'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'
import type { MemorizationPracticeMode } from '@/lib/verseMemorizationStorage'

export function isValidPracticeKeystrokeForToken(key: string, token: MemorizationToken): boolean {
  if (key.length !== 1) return false
  if (token.kind === 'punct') return false
  if (token.kind === 'digit') return /^[0-9]$/.test(key)
  return /^[a-zA-Z]$/.test(key)
}

export function isPracticeKeystrokeCorrect(key: string, token: MemorizationToken): boolean {
  if (token.kind === 'digit') return key === token.text
  const expected = firstLetterOfWord(token.text)
  if (!expected) return false
  return key.toLowerCase() === expected
}

export function cueSlotToRevealAfterCorrectTypable(
  practiceMode: MemorizationPracticeMode | null,
  tokenIndex: number,
  typableIndices: number[],
  cueHiddenSlots: Set<number>
): number | null {
  if (practiceMode !== 'firstLetters') return null
  const slot = typableIndices.indexOf(tokenIndex)
  if (slot < 0 || !cueHiddenSlots.has(slot)) return null
  return slot
}
