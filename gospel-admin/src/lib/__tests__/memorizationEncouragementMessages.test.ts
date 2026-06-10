import {
  MEMORIZATION_ALL_DONE_MESSAGES,
  MEMORIZATION_ENCOURAGEMENT_MESSAGES,
  MEMORIZATION_ROUND_AFFIRMATIONS,
  pickRandomAllDoneMessage,
  pickRandomEncouragementMessage,
  pickRandomRoundAffirmation,
} from '@/lib/memorizationEncouragementMessages'

describe('memorizationEncouragementMessages', () => {
  it('pickRandomRoundAffirmation returns an entry from the round list', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0)
    expect(pickRandomRoundAffirmation()).toBe(MEMORIZATION_ROUND_AFFIRMATIONS[0])
    spy.mockRestore()
  })

  it('pickRandomAllDoneMessage returns an entry from the completion list', () => {
    const n = MEMORIZATION_ALL_DONE_MESSAGES.length
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.999)
    expect(pickRandomAllDoneMessage()).toBe(MEMORIZATION_ALL_DONE_MESSAGES[Math.floor(0.999 * n)])
    spy.mockRestore()
  })

  it('pickRandomEncouragementMessage draws from round and all-done pools', () => {
    expect(MEMORIZATION_ENCOURAGEMENT_MESSAGES.length).toBe(
      MEMORIZATION_ROUND_AFFIRMATIONS.length + MEMORIZATION_ALL_DONE_MESSAGES.length
    )
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0)
    expect(pickRandomEncouragementMessage()).toBe(MEMORIZATION_ENCOURAGEMENT_MESSAGES[0])
    spy.mockRestore()
  })
})
