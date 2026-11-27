import {
  buildInitialReorderSlotAssignment,
  buildMemorizationChoiceLabels,
  buildBibleBooksReorderChunks,
  buildMemorizationReorderChunks,
  buildMemorizationTokens,
  tokenizeMemorizationPlainWord,
  cueGlyphForTypableToken,
  firstLetterGlyphOfWord,
  firstLetterOfWord,
  formatMemorizationTokensPlain,
  buildReciteSttKeyterms,
  RECITE_STT_CURATED_KEYTERMS,
  RECITE_STT_KEYTERM_MAX_CHARS,
  RECITE_STT_KEYTERM_MAX_COUNT,
  generateMemorizationSessionSeed,
  getTypableTokenIndices,
  getWordsForMemorization,
  hiddenFractionForRound,
  parseReferenceMemorizationTokens,
  pickHiddenCueTypableSlotIndices,
  pickHiddenWordIndices,
  pickReorderMovableIndices,
  referenceTextsForMemorizationReorder,
  reorderReferenceColonAfterSlotIndex,
  reorderMovableCountForRound,
  reorderSlotsBecameCorrectAfterSwap,
  seedRandom,
  splitMemorizationChoiceRows,
  memorizationWordChoiceRowCount,
  memorizationWordChoicesPanelMinHeight,
  stringToSeed,
  MEMORIZATION_FULL_HIDE_ROUND,
  MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT,
  MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMFORTABLE,
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

  it('firstLetterGlyphOfWord preserves letter case', () => {
    expect(firstLetterGlyphOfWord('God,')).toBe('G')
    expect(firstLetterGlyphOfWord('(Son)')).toBe('S')
    expect(firstLetterGlyphOfWord('(son)')).toBe('s')
  })

  it('cueGlyphForTypableToken returns first letter (preserves case), digit, or middle dot fallback', () => {
    expect(cueGlyphForTypableToken({ kind: 'word', text: 'God,' })).toBe('G')
    expect(cueGlyphForTypableToken({ kind: 'word', text: '(son)' })).toBe('s')
    expect(cueGlyphForTypableToken({ kind: 'digit', text: '3' })).toBe('3')
    expect(cueGlyphForTypableToken({ kind: 'word', text: '123' })).toBe('·')
  })

  it('pickHiddenCueTypableSlotIndices is deterministic for same seed', () => {
    const a = pickHiddenCueTypableSlotIndices(12, 3, 'session-seed')
    const b = pickHiddenCueTypableSlotIndices(12, 3, 'session-seed')
    expect([...a].sort((x, y) => x - y)).toEqual([...b].sort((x, y) => x - y))
  })

  it('pickHiddenCueTypableSlotIndices hides none at round 1 and all at full round', () => {
    expect(pickHiddenCueTypableSlotIndices(8, 1, 'id').size).toBe(0)
    expect(pickHiddenCueTypableSlotIndices(8, MEMORIZATION_FULL_HIDE_ROUND, 'id').size).toBe(8)
  })

  it('pickHiddenCueTypableSlotIndices round 2 differs from round 3 for same seed', () => {
    const r2 = pickHiddenCueTypableSlotIndices(20, 2, 'same')
    const r3 = pickHiddenCueTypableSlotIndices(20, 3, 'same')
    expect(r2.size).toBe(5)
    expect(r3.size).toBe(10)
    const same = r2.size === r3.size && [...r2].every((i) => r3.has(i))
    expect(same).toBe(false)
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

  it('tokenizeMemorizationPlainWord splits numeric-only words into digit tokens', () => {
    expect(tokenizeMemorizationPlainWord('1')).toEqual([{ kind: 'digit', text: '1' }])
    expect(tokenizeMemorizationPlainWord('16')).toEqual([
      { kind: 'digit', text: '1' },
      { kind: 'digit', text: '6' },
    ])
    expect(tokenizeMemorizationPlainWord('Corinthians')).toEqual([{ kind: 'word', text: 'Corinthians' }])
  })

  it('buildMemorizationTokens treats numeric book prefixes as digit blanks', () => {
    const t = buildMemorizationTokens('1 Thessalonians 2 Timothy', '')
    const typable = getTypableTokenIndices(t)
    const digitTexts = typable.filter((i) => t[i]!.kind === 'digit').map((i) => t[i]!.text)
    expect(digitTexts).toEqual(['1', '2'])
    expect(formatMemorizationTokensPlain(t)).toBe('1 Thessalonians 2 Timothy')
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

  it('buildMemorizationReorderChunks splits clauses and appends reference as book, chapter, verse', () => {
    const c = buildMemorizationReorderChunks('a, b; c', 'John 3:16')
    expect(c.map((x) => x.text)).toEqual(['a', 'b', 'c', 'John', '3', '16'])
    expect(c.map((x) => x.id)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('referenceTextsForMemorizationReorder splits ranges and chapter-only refs', () => {
    expect(referenceTextsForMemorizationReorder('Isaiah 40:25–26')).toEqual(['Isaiah', '40', '25-26'])
    expect(referenceTextsForMemorizationReorder('Psalm 23')).toEqual(['Psalm', '23'])
    expect(referenceTextsForMemorizationReorder('not a ref')).toEqual(['not a ref'])
  })

  it('reorderReferenceColonAfterSlotIndex marks the chapter slot before a parsed verse', () => {
    expect(
      reorderReferenceColonAfterSlotIndex(
        buildMemorizationReorderChunks('a, b', 'John 3:16').length,
        'John 3:16'
      )
    ).toBe(3)
    expect(reorderReferenceColonAfterSlotIndex(3, 'Psalm 23')).toBeNull()
    expect(reorderReferenceColonAfterSlotIndex(4, 'weird')).toBeNull()
  })

  it('buildMemorizationReorderChunks can omit reference chunk for reorder UI', () => {
    const c = buildMemorizationReorderChunks('a, b; c', 'John 3:16', {
      includeReferenceChunk: false,
    })
    expect(c.map((x) => x.text)).toEqual(['a', 'b', 'c'])
  })

  it('buildMemorizationReorderChunks uses whole verse when no clause punctuation', () => {
    const c = buildMemorizationReorderChunks('one two three four five', 'Ref')
    expect(c[c.length - 1]!.text).toBe('Ref')
    expect(c.length).toBeGreaterThan(1)
  })

  it('buildMemorizationReorderChunks handles very short verse', () => {
    const c = buildMemorizationReorderChunks('Hi', 'R 1:1')
    expect(c.map((x) => x.text)).toEqual(['Hi', 'R', '1', '1'])
  })

  it('buildBibleBooksReorderChunks creates one chunk per book name', () => {
    const c = buildBibleBooksReorderChunks(['Genesis', 'Exodus', 'Song of Solomon'])
    expect(c.map((x) => x.text)).toEqual(['Genesis', 'Exodus', 'Song of Solomon'])
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

  it('reorderSlotsBecameCorrectAfterSwap returns slots fixed by a swap', () => {
    expect(reorderSlotsBecameCorrectAfterSwap([0, 3, 2, 1], [0, 1, 2, 3])).toEqual([1, 3])
  })

  it('splitMemorizationChoiceRows balances labels across rows', () => {
    expect(splitMemorizationChoiceRows(['a', 'b', 'c', 'd'], 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
    expect(splitMemorizationChoiceRows(['a', 'b', 'c', 'd', 'e'], 3)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
      ['e'],
    ])
    expect(splitMemorizationChoiceRows([], 3)).toEqual([[], [], []])
  })

  it('memorizationWordChoiceRowCount switches at comfortable width', () => {
    expect(memorizationWordChoiceRowCount(false)).toBe(MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT)
    expect(memorizationWordChoiceRowCount(true)).toBe(MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMFORTABLE)
  })

  it('memorizationWordChoicesPanelMinHeight varies by row count', () => {
    const compact = memorizationWordChoicesPanelMinHeight(MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT)
    const comfortable = memorizationWordChoicesPanelMinHeight(
      MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMFORTABLE
    )
    expect(compact).toContain('* 3 + 2rem')
    expect(comfortable).toContain('* 2 + 1rem')
    expect(compact).not.toEqual(comfortable)
  })
})

describe('buildReciteSttKeyterms', () => {
  const curatedLower = new Set(RECITE_STT_CURATED_KEYTERMS.map((term) => term.toLowerCase()))

  it('stays within the xAI keyterm limits', () => {
    expect(RECITE_STT_KEYTERM_MAX_COUNT).toBe(100)
    expect(RECITE_STT_KEYTERM_MAX_CHARS).toBe(50)
    expect(RECITE_STT_CURATED_KEYTERMS.length).toBeLessThanOrEqual(100)
    const seen = new Set<string>()
    for (const term of RECITE_STT_CURATED_KEYTERMS) {
      expect(term.length).toBeGreaterThan(0)
      expect(term.length).toBeLessThanOrEqual(RECITE_STT_KEYTERM_MAX_CHARS)
      expect(seen.has(term.toLowerCase())).toBe(false)
      seen.add(term.toLowerCase())
    }

    for (const reference of ['', 'Psalm 131:1', '1 Corinthians 13:4-7', 'John 3:16']) {
      const terms = buildReciteSttKeyterms(reference)
      expect(terms.length).toBeLessThanOrEqual(RECITE_STT_KEYTERM_MAX_COUNT)
      for (const term of terms) {
        expect(term.length).toBeLessThanOrEqual(RECITE_STT_KEYTERM_MAX_CHARS)
      }
    }
  })

  it('uses canon reference metadata and never verse words', () => {
    const psalm = buildReciteSttKeyterms('Psalm 131:1')
    expect(psalm.slice(0, 3)).toEqual(['Psalms', 'Psalm', 'Psalms 131 1'])
    expect(psalm).not.toContain('lifted')
    expect(psalm).not.toContain('heart')
    expect(psalm.join(' ')).not.toContain('my heart is not lifted up')

    const john = buildReciteSttKeyterms('John 3:16')
    expect(john.slice(0, 2)).toEqual(['John', 'John 3 16'])
    expect(john).not.toContain('loved')
    expect(john).not.toContain('world')
    expect(john.join(' ')).not.toContain('For God so loved the world')

    const corinthians = buildReciteSttKeyterms('1 Corinthians 13:4-7')
    expect(corinthians.slice(0, 3)).toEqual([
      '1 Corinthians',
      'First Corinthians',
      '1 Corinthians 13 4 7',
    ])
  })

  it('drops free text that is not a canon reference', () => {
    const smuggled = buildReciteSttKeyterms('For God so loved the world 3:16')
    expect(smuggled).toEqual([...RECITE_STT_CURATED_KEYTERMS])
    expect(smuggled.join(' ')).not.toMatch(/loved|world/i)

    expect(buildReciteSttKeyterms('')).toEqual([...RECITE_STT_CURATED_KEYTERMS])
    expect(buildReciteSttKeyterms('Bible Books (OT)')).toEqual([...RECITE_STT_CURATED_KEYTERMS])
  })

  it('adds only curated terms after the reference hints', () => {
    const terms = buildReciteSttKeyterms('John 3:16')
    const referenceHints = terms.filter((term) => !curatedLower.has(term.toLowerCase()))
    expect(referenceHints).toEqual(['John', 'John 3 16'])
    expect(terms.filter((term) => curatedLower.has(term.toLowerCase()))).toEqual([
      ...RECITE_STT_CURATED_KEYTERMS,
    ])
  })
})
