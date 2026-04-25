import {
  processWordsForVoiceHold,
  spokenMatchesTypableToken,
  tokenizeTranscriptToWords,
} from '@/lib/memorizationVoiceMatching'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

describe('memorizationVoiceMatching', () => {
  const tokens: MemorizationToken[] = [
    { kind: 'word', text: 'For' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'God' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'so' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'loved' },
  ]
  const typableIndices = [0, 2, 4, 6]

  it('tokenizeTranscriptToWords splits and lowercases', () => {
    expect(tokenizeTranscriptToWords('  For God, ')).toEqual(['for', 'god'])
  })

  it('spokenMatchesTypableToken matches words and digits', () => {
    expect(spokenMatchesTypableToken('For', { kind: 'word', text: 'For' })).toBe(true)
    expect(spokenMatchesTypableToken('for', { kind: 'word', text: 'For' })).toBe(true)
    expect(spokenMatchesTypableToken('3', { kind: 'digit', text: '3' })).toBe(true)
    expect(spokenMatchesTypableToken('three', { kind: 'digit', text: '3' })).toBe(true)
  })

  it('matches an English number word (typable) when STT returns digits (e.g. 12 for twelve)', () => {
    expect(spokenMatchesTypableToken('12', { kind: 'word', text: 'twelve' })).toBe(true)
    expect(spokenMatchesTypableToken('1', { kind: 'word', text: 'one' })).toBe(true)
    expect(spokenMatchesTypableToken('23', { kind: 'word', text: 'twenty-three' })).toBe(true)
    expect(spokenMatchesTypableToken('104', { kind: 'word', text: 'one-hundred-four' })).toBe(true)
  })

  it('STT misspellings of number words (e.g. twleve) still match digit 12 and word twelve', () => {
    expect(spokenMatchesTypableToken('twleve', { kind: 'digit', text: '12' })).toBe(true)
    expect(spokenMatchesTypableToken('twleve', { kind: 'word', text: 'twelve' })).toBe(true)
  })

  it('processWordsForVoiceHold accepts STT "12" for a word-typed "twelve" in the line', () => {
    const phraseTokens: typeof tokens = [
      { kind: 'word', text: 'Test' },
      { kind: 'punct', text: ' ' },
      { kind: 'word', text: 'twelve' },
    ]
    const ti = [0, 2]
    const r = processWordsForVoiceHold({
      tokens: phraseTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['test', '12'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(2)
  })

  it('accepts a missing final s on long words (e.g. "Roman" for "Romans")', () => {
    expect(spokenMatchesTypableToken('Roman', { kind: 'word', text: 'Romans' })).toBe(true)
    expect(spokenMatchesTypableToken('romans', { kind: 'word', text: 'Romans' })).toBe(true)
    // Too short: do not conflate "god" / "gods"
    expect(spokenMatchesTypableToken('god', { kind: 'word', text: 'gods' })).toBe(false)
  })

  it('processWordsForVoiceHold advances on correct sequence from ptt start', () => {
    const hidden = new Set([0])
    const r = processWordsForVoiceHold({
      tokens,
      typableIndices,
      pttStartStep: 0,
      hiddenIndices: hidden,
      spokenWords: ['for', 'god'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(2)
    expect(r.correctKeystrokesDelta).toBe(2)
    expect(r.revealedToAdd).toContain(0)
  })

  it('processWordsForVoiceHold stops on first wrong word', () => {
    const r = processWordsForVoiceHold({
      tokens,
      typableIndices,
      pttStartStep: 0,
      hiddenIndices: new Set([0]),
      spokenWords: ['bad'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(0)
    expect(r.wrongAttemptsDelta).toBe(1)
    expect(r.shouldFlashError).toBe(true)
  })

  it('processWordsForVoiceHold reveals after 3 wrongs but does not advance until a correct match', () => {
    const hidden = new Set([0])
    const r = processWordsForVoiceHold({
      tokens,
      typableIndices,
      pttStartStep: 0,
      hiddenIndices: hidden,
      spokenWords: ['bad'],
      consecutiveWrong: 2,
    })
    expect(r.nextStep).toBe(0)
    expect(r.correctKeystrokesDelta).toBe(0)
    expect(r.revealedToAdd).toContain(0)
    expect(r.wrongAttemptsDelta).toBe(1)
  })

  it('does not treat a short sub-prefix (e.g. "gene" for "Genesis") as in-progress — avoids stalling the session', () => {
    const phraseTokens: typeof tokens = [
      { kind: 'word', text: 'God' },
      { kind: 'punct', text: ' ' },
      { kind: 'word', text: 'Genesis' },
    ]
    const ti = [0, 2]
    const r = processWordsForVoiceHold({
      tokens: phraseTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['god', 'gene'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(1)
    expect(r.wrongAttemptsDelta).toBe(1)
    expect(r.shouldFlashError).toBe(true)
  })

  it('does not flash wrong when STT is still building the word (prefix of expected, e.g. create → created)', () => {
    const phraseTokens: typeof tokens = [
      { kind: 'word', text: 'God' },
      { kind: 'punct', text: ' ' },
      { kind: 'word', text: 'created' },
    ]
    const ti = [0, 2]
    const r1 = processWordsForVoiceHold({
      tokens: phraseTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['god', 'create'],
      consecutiveWrong: 0,
    })
    expect(r1.nextStep).toBe(1)
    expect(r1.wrongAttemptsDelta).toBe(0)
    expect(r1.shouldFlashError).toBe(false)
    const r2 = processWordsForVoiceHold({
      tokens: phraseTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['god', 'created'],
      consecutiveWrong: 0,
    })
    expect(r2.nextStep).toBe(2)
    expect(r2.correctKeystrokesDelta).toBe(2)
  })

  it('skips a dropped function word if the next typable still matches the same audio (e.g. "the" before "earth")', () => {
    const phraseTokens: typeof tokens = [
      { kind: 'word', text: 'heavens' },
      { kind: 'punct', text: ' ' },
      { kind: 'word', text: 'and' },
      { kind: 'punct', text: ' ' },
      { kind: 'word', text: 'the' },
      { kind: 'punct', text: ' ' },
      { kind: 'word', text: 'earth' },
    ]
    const ti = [0, 2, 4, 6]
    const r = processWordsForVoiceHold({
      tokens: phraseTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      // STT omitted "the" but kept "heavens" "and" "earth" in order
      spokenWords: ['heavens', 'and', 'earth'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(4)
    expect(r.correctKeystrokesDelta).toBe(4)
  })

  it('expands STT "11" into two 1s when reference is 1:1 (two single-digit typables)', () => {
    const refTokens: typeof tokens = [
      { kind: 'word', text: 'Genesis' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '1' },
      { kind: 'punct', text: ':' },
      { kind: 'digit', text: '1' },
    ]
    const ti = [0, 2, 4]
    const r = processWordsForVoiceHold({
      tokens: refTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['genesis', '11'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(3)
    expect(r.correctKeystrokesDelta).toBe(3)
  })

  it('expands a trailing "11" when STT already emitted the chapter digit as a separate "1" (1 : 1 fusion split across words)', () => {
    const refTokens: typeof tokens = [
      { kind: 'word', text: 'Genesis' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '1' },
      { kind: 'punct', text: ':' },
      { kind: 'digit', text: '1' },
    ]
    const ti = [0, 2, 4]
    const r = processWordsForVoiceHold({
      tokens: refTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['genesis', '1', '11'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(3)
    expect(r.correctKeystrokesDelta).toBe(3)
  })

  it('does not expand "11" when one typable is a two-digit token (e.g. chapter 11)', () => {
    const refTokens: typeof tokens = [
      { kind: 'word', text: 'John' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '11' },
    ]
    const ti = [0, 2]
    const r = processWordsForVoiceHold({
      tokens: refTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['john', '11'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(2)
  })

  it('splits fused numeric STT (828) into chapter and verse (8, 28) for Romans 8:28', () => {
    const refTokens: typeof tokens = [
      { kind: 'word', text: 'Romans' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '8' },
      { kind: 'punct', text: ':' },
      { kind: 'digit', text: '28' },
    ]
    const ti = [0, 2, 4]
    const r = processWordsForVoiceHold({
      tokens: refTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['romans', '828'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(3)
    expect(r.correctKeystrokesDelta).toBe(3)
  })

  it('processWordsForVoiceHold matches multi-word English for a single reference number (e.g. 23)', () => {
    const refTokens: typeof tokens = [
      { kind: 'word', text: 'Romans' },
      { kind: 'punct', text: ' ' },
      { kind: 'digit', text: '3' },
      { kind: 'punct', text: ':' },
      { kind: 'digit', text: '23' },
    ]
    const ti = [0, 2, 4]
    const r = processWordsForVoiceHold({
      tokens: refTokens,
      typableIndices: ti,
      pttStartStep: 0,
      hiddenIndices: new Set(),
      spokenWords: ['romans', 'three', 'twenty', 'three'],
      consecutiveWrong: 0,
    })
    expect(r.nextStep).toBe(3)
    expect(r.correctKeystrokesDelta).toBe(3)
  })
})
