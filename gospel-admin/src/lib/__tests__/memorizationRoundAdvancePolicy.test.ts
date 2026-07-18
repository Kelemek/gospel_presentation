import {
  getMemorizationRoundCompleteInstruction,
  memorizationRoundAdvanceShowsFinishPractice,
  memorizationRoundAdvanceShowsNextRound,
  memorizationRoundAdvanceShowsStrictErrorsBadge,
  shouldAutoCompleteFinalRound,
  shouldAutoRevealAfterWrongAttempts,
  shouldBlockFinishPractice,
} from '@/lib/memorizationRoundAdvancePolicy'

describe('memorizationRoundAdvancePolicy', () => {
  it('shouldAutoRevealAfterWrongAttempts respects strict mode and threshold', () => {
    expect(shouldAutoRevealAfterWrongAttempts(false, 2)).toBe(false)
    expect(shouldAutoRevealAfterWrongAttempts(false, 3)).toBe(true)
    expect(shouldAutoRevealAfterWrongAttempts(true, 5)).toBe(false)
  })

  it('shouldAutoCompleteFinalRound only when no round errors', () => {
    expect(shouldAutoCompleteFinalRound(0)).toBe(true)
    expect(shouldAutoCompleteFinalRound(1)).toBe(false)
  })

  it('shouldBlockFinishPractice during strict final-round advance', () => {
    expect(shouldBlockFinishPractice(true, true, true)).toBe(true)
    expect(shouldBlockFinishPractice(true, true, false)).toBe(false)
    expect(shouldBlockFinishPractice(false, true, true)).toBe(false)
  })

  it('memorizationRoundAdvanceShowsNextRound hides next on strict errors', () => {
    expect(
      memorizationRoundAdvanceShowsNextRound({
        isFinalRound: false,
        roundCompletedWithErrors: true,
        strictMode: true,
        wrongAttemptsInRound: 2,
      })
    ).toBe(false)
    expect(
      memorizationRoundAdvanceShowsNextRound({
        isFinalRound: false,
        roundCompletedWithErrors: true,
        strictMode: false,
        wrongAttemptsInRound: 2,
      })
    ).toBe(true)
  })

  it('memorizationRoundAdvanceShowsFinishPractice only in normal final advance', () => {
    expect(
      memorizationRoundAdvanceShowsFinishPractice({
        isRoundComplete: true,
        isFinalRound: true,
        strictMode: false,
      })
    ).toBe(true)
    expect(
      memorizationRoundAdvanceShowsFinishPractice({
        isRoundComplete: true,
        isFinalRound: true,
        strictMode: true,
      })
    ).toBe(false)
  })

  it('memorizationRoundAdvanceShowsStrictErrorsBadge only during active round', () => {
    expect(
      memorizationRoundAdvanceShowsStrictErrorsBadge({
        strictMode: true,
        wrongAttemptsInRound: 1,
        isActiveRound: true,
      })
    ).toBe(true)
    expect(
      memorizationRoundAdvanceShowsStrictErrorsBadge({
        strictMode: true,
        wrongAttemptsInRound: 1,
        isActiveRound: false,
      })
    ).toBe(false)
  })

  it('getMemorizationRoundCompleteInstruction varies by final round and finish option', () => {
    expect(
      getMemorizationRoundCompleteInstruction({
        isFinalRound: true,
        showFinishPracticeOption: true,
        roundIndex: 5,
      })
    ).toContain('finish practice')
    expect(
      getMemorizationRoundCompleteInstruction({
        isFinalRound: true,
        showFinishPracticeOption: false,
        roundIndex: 5,
      })
    ).toContain('no errors')
    expect(
      getMemorizationRoundCompleteInstruction({
        isFinalRound: false,
        showFinishPracticeOption: false,
        roundIndex: 2,
      })
    ).toContain('round 3')
  })
})
