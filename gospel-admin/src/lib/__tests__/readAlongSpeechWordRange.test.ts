import {
  currentWordRangeInChunk,
  firstWordRangeInChunk,
  wordExtentAtChunkOffset,
  wordExtentEndingBefore,
  wordRangeTrailingBehindCharIndex,
} from '@/lib/readAlongSpeechWordRange'

describe('readAlongSpeechWordRange', () => {
  it('wordExtentAtChunkOffset skips whitespace then expands token', () => {
    expect(wordExtentAtChunkOffset('  Hello world', 0)).toEqual({ start: 2, endExclusive: 7 })
    expect(wordExtentAtChunkOffset('Hello world', 2)).toEqual({ start: 0, endExclusive: 5 })
    expect(wordExtentAtChunkOffset('Hello world', 6)).toEqual({ start: 6, endExclusive: 11 })
  })

  it('wordExtentEndingBefore finds the previous token', () => {
    expect(wordExtentEndingBefore('Hi there buddy', 3)).toEqual({ start: 0, endExclusive: 2 })
    expect(wordExtentEndingBefore('Hi there buddy', 0)).toBeNull()
  })

  it('wordRangeTrailingBehindCharIndex walks backward by N words', () => {
    const chunk = 'Now, in the present day, Jesus Christ is not here. He is risen'
    const heIs = chunk.indexOf('He is')
    const charAtSecondIs = heIs + 3
    expect(wordRangeTrailingBehindCharIndex(chunk, charAtSecondIs, 5)).toEqual({
      relStart: chunk.indexOf('Christ'),
      relEndExclusive: chunk.indexOf('Christ') + 'Christ'.length,
    })
    expect(wordRangeTrailingBehindCharIndex(chunk, charAtSecondIs, 0)?.relStart).toBe(heIs + 3)
  })

  it('firstWordRangeInChunk returns first non-whitespace token', () => {
    expect(firstWordRangeInChunk('  Hi there.')).toEqual({ relStart: 2, relEndExclusive: 4 })
    expect(firstWordRangeInChunk('   \n')).toBeNull()
  })

  it('currentWordRangeInChunk ignores charLength and applies engine word trail', () => {
    const ev = { charIndex: 4, charLength: 5 } as SpeechSynthesisEvent
    expect(currentWordRangeInChunk('Hi there buddy', ev)).toEqual({ relStart: 0, relEndExclusive: 2 })
  })

  it('currentWordRangeInChunk single-token chunk cannot trail earlier', () => {
    const ev = { charIndex: 4, charLength: 200 } as SpeechSynthesisEvent
    expect(currentWordRangeInChunk('0123456789', ev)).toEqual({ relStart: 0, relEndExclusive: 10 })
  })

  it('currentWordRangeInChunk trails from sentence boundaries consistently', () => {
    const chunk = 'Say hello. Then wait.'
    const thenIdx = chunk.indexOf('Then')
    const ev = {
      charIndex: thenIdx,
      charLength: 15,
      name: 'sentence',
    } as SpeechSynthesisEvent
    expect(currentWordRangeInChunk(chunk, ev)).toEqual({ relStart: 0, relEndExclusive: 3 })
  })
})
