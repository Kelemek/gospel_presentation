import {
  formatMaskedReference,
  formatVerseClueSnippet,
  getLocalDateKey,
  getPromptAtIndex,
  getTodayPrompt,
  hashDateKey,
  normalizePromptIndex,
  isTodayChallengeCompleted,
  loadDailyVerseChallengeCompletion,
  referencesMatchExactVerse,
  resolveDailyVerseHuntEncouragementMessage,
  saveDailyVerseChallengeCompletion,
  tokenizeVerseForMask,
  tryCompleteDailyVerseChallenge,
  type DailyVersePrompt,
} from '@/lib/dailyVerseChallenge'
import fixturePrompts from '../../../data/daily-verse-challenge/prompts.fixtures.json'

const FIXTURE_PROMPTS = fixturePrompts.prompts as DailyVersePrompt[]

describe('dailyVerseChallenge', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('getLocalDateKey returns YYYY-MM-DD in local time', () => {
    const key = getLocalDateKey(new Date(2026, 5, 7, 15, 30))
    expect(key).toBe('2026-06-07')
  })

  it('normalizePromptIndex wraps around prompt count', () => {
    expect(normalizePromptIndex(-1, 5)).toBe(4)
    expect(normalizePromptIndex(5, 5)).toBe(0)
  })

  it('getPromptAtIndex wraps and returns the expected prompt', () => {
    expect(getPromptAtIndex(FIXTURE_PROMPTS, 2)?.id).toBe(
      'john-3-16-book-blank'
    )
  })

  it('getTodayPrompt is deterministic for a date', () => {
    const date = new Date(2026, 0, 15)
    const a = getTodayPrompt(FIXTURE_PROMPTS, date)
    const b = getTodayPrompt(FIXTURE_PROMPTS, date)
    expect(a?.id).toBe(b?.id)
    expect(hashDateKey('2026-01-15') % FIXTURE_PROMPTS.length).toBe(
      FIXTURE_PROMPTS.indexOf(a!)
    )
  })

  it('formatMaskedReference hides verse, chapter, and book', () => {
    expect(
      formatMaskedReference('John 3:16', { hide: ['verse'] })
    ).toBe('John 3:__')
    expect(
      formatMaskedReference('John 3:16', { hide: ['chapter'] })
    ).toBe('John __:16')
    expect(
      formatMaskedReference('John 3:16', { hide: ['book'] })
    ).toBe('??? 3:16')
  })

  it('tokenizeVerseForMask strips leading verse number', () => {
    expect(tokenizeVerseForMask('16 For God so loved the world.')).toEqual([
      'For',
      'God',
      'so',
      'loved',
      'the',
      'world',
    ])
    expect(tokenizeVerseForMask('[16] For God so loved the world.')).toEqual([
      'For',
      'God',
      'so',
      'loved',
      'the',
      'world',
    ])
  })

  it('formatVerseClueSnippet truncates with ellipsis', () => {
    const words = Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ')
    const snippet = formatVerseClueSnippet(`1 ${words}`, 5)
    expect(snippet).toBe('w0 w1 w2 w3 w4…')
  })

  it('referencesMatchExactVerse requires same book chapter and verse start', () => {
    expect(referencesMatchExactVerse('John 3:16', 'John 3:16')).toBe(true)
    expect(referencesMatchExactVerse('John 3', 'John 3:16')).toBe(false)
    expect(referencesMatchExactVerse('John 3:16-18', 'John 3:16')).toBe(true)
    expect(referencesMatchExactVerse('John 3:17', 'John 3:16')).toBe(false)
    expect(referencesMatchExactVerse('Romans 8:28', 'John 3:16')).toBe(false)
  })

  it('persists completion in localStorage for today only', () => {
    saveDailyVerseChallengeCompletion({
      dateKey: getLocalDateKey(),
      promptId: 'john-3-16-verse-blank',
    })
    expect(loadDailyVerseChallengeCompletion()?.promptId).toBe('john-3-16-verse-blank')
    expect(isTodayChallengeCompleted('john-3-16-verse-blank')).toBe(true)
    expect(isTodayChallengeCompleted('other-id')).toBe(false)
  })

  it('tryCompleteDailyVerseChallenge saves hunt encouragement when reference matches', () => {
    const prompts = FIXTURE_PROMPTS
    const date = new Date(2026, 0, 15)
    const today = getTodayPrompt(prompts, date)!
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)
    const result = tryCompleteDailyVerseChallenge(today.reference, date, prompts)
    randomSpy.mockRestore()
    expect(result?.prompt.id).toBe(today.id)
    expect(result?.encouragementMessage).toBe(
      'Nice find—you traced the clue to the right passage. Well done.'
    )
    expect(loadDailyVerseChallengeCompletion()?.encouragementMessage).toBe(
      result?.encouragementMessage
    )
    expect(isTodayChallengeCompleted(today.id, date)).toBe(true)
    expect(tryCompleteDailyVerseChallenge(today.reference, date, prompts)).toBeNull()
  })

  it('resolveDailyVerseHuntEncouragementMessage uses stored or stable fallback', () => {
    expect(
      resolveDailyVerseHuntEncouragementMessage({
        dateKey: '2026-01-15',
        promptId: 'john-3-16-verse-blank',
        encouragementMessage: 'Custom encouragement.',
      })
    ).toBe('Custom encouragement.')
    expect(
      resolveDailyVerseHuntEncouragementMessage({
        dateKey: '2026-01-15',
        promptId: 'john-3-16-verse-blank',
      })
    ).toBeTruthy()
  })

})
