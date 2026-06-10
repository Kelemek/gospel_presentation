import {
  DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES,
  pickRandomDailyVerseHuntEncouragementMessage,
} from '@/lib/dailyVerseHuntEncouragementMessages'

describe('dailyVerseHuntEncouragementMessages', () => {
  it('pickRandomDailyVerseHuntEncouragementMessage draws from the hunt pool', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
    expect(pickRandomDailyVerseHuntEncouragementMessage()).toBe(
      DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES[0]
    )
    randomSpy.mockRestore()
  })
})
