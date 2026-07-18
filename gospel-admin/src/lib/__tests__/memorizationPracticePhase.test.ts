import {
  isPracticePhaseActiveRound,
  isPracticePhaseDone,
  isPracticePhaseFinalRound,
  isPracticePhaseInSession,
  isPracticePhaseIntro,
  isPracticePhaseRoundComplete,
  memorizationPracticePhaseReducer,
  MEMORIZATION_PRACTICE_PHASE_INTRO,
  practicePhaseDoneMessage,
  practicePhaseHadErrors,
  practicePhaseRoundIndex,
} from '@/lib/memorizationPracticePhase'

describe('memorizationPracticePhase', () => {
  it('starts at intro', () => {
    expect(MEMORIZATION_PRACTICE_PHASE_INTRO.kind).toBe('intro')
  })

  it('moves intro → activeRound → roundComplete → activeRound on repeat', () => {
    let phase = MEMORIZATION_PRACTICE_PHASE_INTRO
    phase = memorizationPracticePhaseReducer(phase, { type: 'startActiveRound', roundIndex: 2 })
    expect(phase).toEqual({ kind: 'activeRound', roundIndex: 2 })
    expect(isPracticePhaseActiveRound(phase)).toBe(true)

    phase = memorizationPracticePhaseReducer(phase, {
      type: 'completeRound',
      roundIndex: 2,
      hadErrors: true,
    })
    expect(phase).toEqual({ kind: 'roundComplete', roundIndex: 2, hadErrors: true })
    expect(practicePhaseHadErrors(phase)).toBe(true)

    phase = memorizationPracticePhaseReducer(phase, { type: 'startActiveRound', roundIndex: 2 })
    expect(phase).toEqual({ kind: 'activeRound', roundIndex: 2 })
  })

  it('finishes with a done message', () => {
    const phase = memorizationPracticePhaseReducer(MEMORIZATION_PRACTICE_PHASE_INTRO, {
      type: 'finish',
      message: 'Well done.',
    })
    expect(isPracticePhaseDone(phase)).toBe(true)
    expect(practicePhaseDoneMessage(phase)).toBe('Well done.')
  })

  it('detects final round from phase round index', () => {
    const phase = memorizationPracticePhaseReducer(MEMORIZATION_PRACTICE_PHASE_INTRO, {
      type: 'startActiveRound',
      roundIndex: 5,
    })
    expect(isPracticePhaseFinalRound(phase)).toBe(true)
    expect(practicePhaseRoundIndex(phase)).toBe(5)
  })

  it('hydrates between-round and in-round snapshots', () => {
    const between = memorizationPracticePhaseReducer(MEMORIZATION_PRACTICE_PHASE_INTRO, {
      type: 'hydrateRoundComplete',
      roundIndex: 3,
      hadErrors: false,
    })
    expect(isPracticePhaseRoundComplete(between)).toBe(true)
    expect(isPracticePhaseInSession(between)).toBe(true)
    expect(isPracticePhaseIntro(between)).toBe(false)

    const active = memorizationPracticePhaseReducer(MEMORIZATION_PRACTICE_PHASE_INTRO, {
      type: 'hydrateActiveRound',
      roundIndex: 4,
    })
    expect(isPracticePhaseActiveRound(active)).toBe(true)
  })
})
