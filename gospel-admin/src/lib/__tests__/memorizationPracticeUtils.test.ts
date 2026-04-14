import {
  buildMemorizationTokens,
  firstLetterOfWord,
  formatMemorizationTokensPlain,
  generateMemorizationSessionSeed,
  getTypableTokenIndices,
  getWordsForMemorization,
  hiddenFractionForRound,
  parseReferenceMemorizationTokens,
  pickHiddenWordIndices,
  MEMORIZATION_FULL_HIDE_ROUND,
} from '@/lib/memorizationPracticeUtils'

describe('memorizationPracticeUtils', () => {
  it('getWordsForMemorization splits on whitespace', () => {
    expect(getWordsForMemorization('For God so loved')).toEqual(['For', 'God', 'so', 'loved'])
  })

  it('hiddenFractionForRound scales to 100% at round 5', () => {
    expect(hiddenFractionForRound(0)).toBe(0)
    expect(hiddenFractionForRound(1)).toBe(0.2)
    expect(hiddenFractionForRound(MEMORIZATION_FULL_HIDE_ROUND)).toBe(1)
  })

  it('pickHiddenWordIndices is deterministic for same seed', () => {
    const a = pickHiddenWordIndices(10, 2, 'verse-id-1')
    const b = pickHiddenWordIndices(10, 2, 'verse-id-1')
    expect([...a].sort((x, y) => x - y)).toEqual([...b].sort((x, y) => x - y))
  })

  it('pickHiddenWordIndices can differ when session seed differs', () => {
    const a = pickHiddenWordIndices(24, 2, 'verse-id-uuid-a')
    const b = pickHiddenWordIndices(24, 2, 'verse-id-uuid-b')
    const same =
      a.size === b.size &&
      [...a].every((i) => b.has(i))
    expect(same).toBe(false)
  })

  it('generateMemorizationSessionSeed returns a non-empty string', () => {
    const s = generateMemorizationSessionSeed()
    expect(typeof s).toBe('string')
    expect(s.length).toBeGreaterThan(0)
  })

  it('pickHiddenWordIndices hides all words at full round', () => {
    const s = pickHiddenWordIndices(7, MEMORIZATION_FULL_HIDE_ROUND, 'id')
    expect(s.size).toBe(7)
  })

  it('firstLetterOfWord skips punctuation', () => {
    expect(firstLetterOfWord('God,')).toBe('g')
    expect(firstLetterOfWord('(Son)')).toBe('s')
  })

  it('parseReferenceMemorizationTokens splits digits and keeps colon/dash as punct', () => {
    expect(parseReferenceMemorizationTokens('Isaiah 40:18')).toEqual([
      { kind: 'word', text: 'Isaiah' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '4' },
      { kind: 'digit', text: '0' },
      { kind: 'punct', text: ':' },
      { kind: 'digit', text: '1' },
      { kind: 'digit', text: '8' },
    ])
    expect(parseReferenceMemorizationTokens('1-2')).toEqual([
      { kind: 'digit', text: '1' },
      { kind: 'punct', text: '-' },
      { kind: 'digit', text: '2' },
    ])
  })

  it('buildMemorizationTokens appends reference after verse with spaces', () => {
    const t = buildMemorizationTokens('For God', 'John 3:16')
    expect(formatMemorizationTokensPlain(t)).toBe('For God John 3:16')
    expect(getTypableTokenIndices(t)).toEqual([0, 2, 4, 6, 8, 9])
  })
})
