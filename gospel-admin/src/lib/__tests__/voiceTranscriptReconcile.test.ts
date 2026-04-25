import {
  newSpokenWordTokensAfterPrefix,
  processWordsForVoiceHoldBestAfterDiverge,
  selectBestTranscriptForVoiceMatch,
} from '@/lib/voiceTranscriptReconcile'
import type { MemorizationToken } from '@/lib/memorizationPracticeUtils'

describe('selectBestTranscriptForVoiceMatch', () => {
  const tokens: MemorizationToken[] = [
    { kind: 'word', text: 'heavens' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'and' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'the' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'earth' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'Genesis' },
    { kind: 'punct', text: ' ' },
    { kind: 'digit', text: '1' },
    { kind: 'punct', text: ':' },
    { kind: 'digit', text: '1' },
  ]
  const typableIndices = [0, 2, 4, 6, 8, 10, 12]
  const base = {
    tokens,
    typableIndices,
    pttStartStep: 0,
    hiddenIndices: new Set<number>(),
    consecutiveWrong: 0,
  }

  it('prefers merge-keep-prev when STT rewrites and→in but appends a reference tail (higher nextStep)', () => {
    const goodSoFar = 'heavens and the earth'
    const sttWorse = 'heavens in the earth genesis 1 1'
    const chosen = selectBestTranscriptForVoiceMatch(goodSoFar, sttWorse, base)
    expect(chosen).toBe('heavens and the earth genesis 1 1')
  })

  it('extends when the new string is a strict word superset of the previous', () => {
    const prev = 'in the'
    const next = 'in the beginning'
    expect(selectBestTranscriptForVoiceMatch(prev, next, base)).toBe(next)
  })

  it('prefers a shorter correction over a longer mistaken take (higher match progress)', () => {
    const mistaken = 'jenna extra words here'
    const correction = 'heavens'
    expect(selectBestTranscriptForVoiceMatch(mistaken, correction, base)).toBe(correction)
  })
})

describe('newSpokenWordTokensAfterPrefix', () => {
  it('treats first partial as a full new segment', () => {
    const r = newSpokenWordTokensAfterPrefix(null, ['in', 'the', 'beginning'])
    expect(r.kind).toBe('all')
    if (r.kind === 'all') expect(r.allReason).toBe('firstPartial')
    expect(r.newWords).toEqual(['in', 'the', 'beginning'])
    expect(r.shouldProcess).toBe(true)
  })

  it('appends only the tail as STT extends the line', () => {
    const prev = ['in', 'the', 'beginning']
    const cur = ['in', 'the', 'beginning', 'god', 'created']
    const r = newSpokenWordTokensAfterPrefix(prev, cur)
    expect(r.kind).toBe('append')
    expect(r.newWords).toEqual(['god', 'created'])
  })

  it('returns no new when STT is a strict prefix of the previous (segment shrink)', () => {
    const prev = ['in', 'the', 'beginning', 'god']
    const cur = ['in', 'the', 'beginning']
    const r = newSpokenWordTokensAfterPrefix(prev, cur)
    expect(r.kind).toBe('noNew')
    expect(r.newWords).toEqual([])
  })

  it('replaces with a full re-run when a token in the line diverges', () => {
    const prev = ['in', 'the', 'heavens', 'and']
    const cur = ['in', 'the', 'heavens', 'or', 'the']
    const r = newSpokenWordTokensAfterPrefix(prev, cur)
    expect(r.kind).toBe('all')
    if (r.kind === 'all') expect(r.allReason).toBe('diverged')
    expect(r.newWords).toEqual(['in', 'the', 'heavens', 'or', 'the'])
  })

  it('flags STT in-word correction (create→created) as diverged for full rematch from PTT', () => {
    const prev = ['in', 'the', 'beginning', 'god', 'create']
    const cur = ['in', 'the', 'beginning', 'god', 'created']
    const r = newSpokenWordTokensAfterPrefix(prev, cur)
    expect(r.kind).toBe('all')
    if (r.kind === 'all') expect(r.allReason).toBe('diverged')
  })
})

describe('processWordsForVoiceHoldBestAfterDiverge', () => {
  const tokens: MemorizationToken[] = [
    { kind: 'word', text: 'alpha' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'bravo' },
    { kind: 'punct', text: ' ' },
    { kind: 'word', text: 'charlie' },
  ]
  const typableIndices = [0, 2, 4]
  const base = {
    tokens,
    typableIndices,
    hiddenIndices: new Set<number>(),
    consecutiveWrong: 0,
  }

  it('realigns when a segment restart sends a tail and rematch from PTT cannot reach current offset', () => {
    const spoken = ['bravo', 'charlie']
    const rPtt0 = processWordsForVoiceHoldBestAfterDiverge(
      { ...base, hiddenIndices: new Set() },
      spoken,
      0,
      0
    )
    expect(rPtt0.nextStep).toBe(0)
    const rResume = processWordsForVoiceHoldBestAfterDiverge(
      { ...base, hiddenIndices: new Set() },
      spoken,
      0,
      1
    )
    expect(rResume.nextStep).toBe(3)
    const rResumePrefixed = processWordsForVoiceHoldBestAfterDiverge(
      { ...base, hiddenIndices: new Set() },
      ['noise', 'bravo', 'charlie'],
      0,
      1
    )
    expect(rResumePrefixed.nextStep).toBe(3)
  })
})
