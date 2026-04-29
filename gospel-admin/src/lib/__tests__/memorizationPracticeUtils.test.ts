import {
  buildInitialReorderSlotAssignment,
  buildMemorizationChoiceLabels,
  buildMemorizationReorderChunks,
  buildMemorizationTokens,
  firstLetterOfWord,
  formatMemorizationTokensPlain,
  generateMemorizationSessionSeed,
  getTypableTokenIndices,
  getWordsForMemorization,
  hiddenFractionForRound,
  parseReferenceMemorizationTokens,
  pickHiddenWordIndices,
  pickReorderMovableIndices,
  reorderMovableCountForRound,
  seedRandom,
  stringToSeed,
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

  it('buildMemorizationChoiceLabels includes correct answer and respects choiceCount', () => {
    const t = buildMemorizationTokens('For God so loved', 'John 3:16')
    const typable = getTypableTokenIndices(t)
    const rng = seedRandom(stringToSeed('test-seed'))
    const labels = buildMemorizationChoiceLabels(t, typable, 2, 4, rng)
    expect(labels).toContain('God')
    expect(labels.length).toBeLessThanOrEqual(4)
    expect(labels.length).toBeGreaterThanOrEqual(1)
  })

  it('buildMemorizationChoiceLabels is deterministic for same rng sequence start', () => {
    const t = buildMemorizationTokens('For God so loved', 'John 3:16')
    const typable = getTypableTokenIndices(t)
    const seed = stringToSeed('stable')
    const a = buildMemorizationChoiceLabels(t, typable, 2, 4, seedRandom(seed))
    const b = buildMemorizationChoiceLabels(t, typable, 2, 4, seedRandom(seed))
    expect(a).toEqual(b)
  })

  it('buildMemorizationChoiceLabels for word blanks excludes verse reference digits', () => {
    const t = buildMemorizationTokens('For God so loved', 'John 3:16')
    const typable = getTypableTokenIndices(t)
    const rng = seedRandom(stringToSeed('word-blank'))
    const labels = buildMemorizationChoiceLabels(t, typable, 2, 6, rng)
    expect(labels).toContain('God')
    for (const l of labels) {
      expect(l).not.toMatch(/^[0-9]$/)
    }
  })

  it('buildMemorizationChoiceLabels for digit blanks uses only single digits', () => {
    const t = buildMemorizationTokens('For God so loved', 'John 3:16')
    const typable = getTypableTokenIndices(t)
    const digitIdx = typable.find((i) => t[i]!.kind === 'digit')
    expect(digitIdx).toBeDefined()
    const rng = seedRandom(stringToSeed('digit-blank'))
    const labels = buildMemorizationChoiceLabels(t, typable, digitIdx!, 4, rng)
    for (const l of labels) {
      expect(l).toMatch(/^[0-9]$/)
    }
  })

  it('buildMemorizationChoiceLabels pads digit distractors with digits not in the verse', () => {
    const t = buildMemorizationTokens('One line', 'Z 9:9')
    const typable = getTypableTokenIndices(t)
    const digitIdx = typable.find((i) => t[i]!.kind === 'digit')
    expect(digitIdx).toBeDefined()
    const rng = seedRandom(123)
    const labels = buildMemorizationChoiceLabels(t, typable, digitIdx!, 4, rng)
    expect(labels).toHaveLength(4)
    const inPassageDigits = new Set(
      typable.filter((i) => t[i]!.kind === 'digit').map((i) => t[i]!.text)
    )
    const fillers = labels.filter((l) => /^[0-9]$/.test(l) && !inPassageDigits.has(l))
    expect(fillers.length).toBeGreaterThanOrEqual(1)
  })

  it('buildMemorizationChoiceLabels returns only correct when no distractors', () => {
    const t = buildMemorizationTokens('Only', '')
    const typable = getTypableTokenIndices(t)
    const labels = buildMemorizationChoiceLabels(t, typable, 0, 4, seedRandom(1))
    expect(labels).toEqual(['Only'])
  })

  it('buildMemorizationChoiceLabels returns empty for non-typable target', () => {
    const t = buildMemorizationTokens('A B', '')
    const typable = getTypableTokenIndices(t)
    expect(buildMemorizationChoiceLabels(t, typable, 1, 4, seedRandom(1))).toEqual([])
  })

  it('buildMemorizationReorderChunks splits clauses and appends reference', () => {
    const c = buildMemorizationReorderChunks('a, b; c', 'John 3:16')
    expect(c.map((x) => x.text)).toEqual(['a', 'b', 'c', 'John 3:16'])
    expect(c.map((x) => x.id)).toEqual([0, 1, 2, 3])
  })

  it('buildMemorizationReorderChunks uses whole verse when no clause punctuation', () => {
    const c = buildMemorizationReorderChunks('one two three four five', 'Ref')
    expect(c[c.length - 1]!.text).toBe('Ref')
    expect(c.length).toBeGreaterThan(1)
  })

  it('buildMemorizationReorderChunks handles very short verse', () => {
    const c = buildMemorizationReorderChunks('Hi', 'R 1:1')
    expect(c.map((x) => x.text)).toEqual(['Hi', 'R 1:1'])
  })

  it('reorderMovableCountForRound increases through rounds', () => {
    const n = 10
    const k1 = reorderMovableCountForRound(1, n)
    const k3 = reorderMovableCountForRound(3, n)
    const k5 = reorderMovableCountForRound(MEMORIZATION_FULL_HIDE_ROUND, n)
    expect(k1).toBeGreaterThanOrEqual(2)
    expect(k3).toBeGreaterThanOrEqual(k1)
    expect(k5).toBe(n)
  })

  it('pickReorderMovableIndices is deterministic for same seed', () => {
    const a = pickReorderMovableIndices(8, 2, 's1')
    const b = pickReorderMovableIndices(8, 2, 's1')
    expect(a).toEqual(b)
    expect(a.length).toBe(reorderMovableCountForRound(2, 8))
  })

  it('buildInitialReorderSlotAssignment deranges movable slots only', () => {
    const n = 5
    const movable = [1, 2, 3]
    const rng = seedRandom(stringToSeed('der'))
    const assign = buildInitialReorderSlotAssignment(n, movable, rng)
    expect(assign[0]).toBe(0)
    expect(assign[4]).toBe(4)
    for (const s of movable) {
      expect(assign[s]).not.toBe(s)
    }
  })
})
