import {
  cueSlotToRevealAfterCorrectTypable,
  isPracticeKeystrokeCorrect,
  isValidPracticeKeystrokeForToken,
} from '@/lib/memorizationPracticeKeystroke'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

describe('memorizationPracticeKeystroke', () => {
  const wordToken: MemorizationToken = { kind: 'word', text: 'faith' }
  const digitToken: MemorizationToken = { kind: 'digit', text: '3' }

  it('validates word and digit keystrokes', () => {
    expect(isValidPracticeKeystrokeForToken('f', wordToken)).toBe(true)
    expect(isValidPracticeKeystrokeForToken('3', wordToken)).toBe(false)
    expect(isValidPracticeKeystrokeForToken('3', digitToken)).toBe(true)
    expect(isValidPracticeKeystrokeForToken('a', digitToken)).toBe(false)
  })

  it('checks correctness for word first letter and digit', () => {
    expect(isPracticeKeystrokeCorrect('F', wordToken)).toBe(true)
    expect(isPracticeKeystrokeCorrect('g', wordToken)).toBe(false)
    expect(isPracticeKeystrokeCorrect('3', digitToken)).toBe(true)
    expect(isPracticeKeystrokeCorrect('4', digitToken)).toBe(false)
  })

  it('reveals first-letter cue slot after correct typable', () => {
    const typableIndices = [2, 5, 8]
    const cueHidden = new Set([1])
    expect(
      cueSlotToRevealAfterCorrectTypable('firstLetters', 5, typableIndices, cueHidden)
    ).toBe(1)
    expect(
      cueSlotToRevealAfterCorrectTypable('type', 5, typableIndices, cueHidden)
    ).toBeNull()
    expect(
      cueSlotToRevealAfterCorrectTypable('firstLetters', 2, typableIndices, cueHidden)
    ).toBeNull()
  })
})
