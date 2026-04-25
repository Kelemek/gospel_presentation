import { transcriptTextFromPartialEvent } from '@/lib/memorizeNativeSpeech'

describe('transcriptTextFromPartialEvent', () => {
  it('uses accumulatedText when set', () => {
    expect(
      transcriptTextFromPartialEvent({
        matches: ['last'],
        accumulated: 'a b',
        accumulatedText: 'a b c',
      })
    ).toBe('a b c')
  })

  it('joins accumulated and matches for continuous PTT', () => {
    expect(
      transcriptTextFromPartialEvent({
        matches: ['c d'],
        accumulated: 'a b',
      })
    ).toBe('a b c d')
  })

  it('does not duplicate when matches[0] extends accumulated (prefix overlap)', () => {
    expect(
      transcriptTextFromPartialEvent({
        matches: ['In the beginning God created'],
        accumulated: 'In the begin',
      })
    ).toBe('In the beginning God created')
  })

  it('prefers longer accumulated when matches is only a shorter prefix', () => {
    expect(
      transcriptTextFromPartialEvent({
        matches: ['In the begin'],
        accumulated: 'In the beginning God',
      })
    ).toBe('In the beginning God')
  })

  it('falls back to matches[0] when there is no accumulated', () => {
    expect(
      transcriptTextFromPartialEvent({
        matches: ['only'],
      })
    ).toBe('only')
  })
})
