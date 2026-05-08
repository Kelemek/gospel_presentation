import {
  currentWordRangeInChunk,
  firstWordRangeInChunk,
  wordExtentAtChunkOffset,
} from '@/lib/readAlongSpeechWordRange'

describe('readAlongSpeechWordRange', () => {
  it('wordExtentAtChunkOffset skips whitespace then expands token', () => {
    expect(wordExtentAtChunkOffset('  Hello world', 0)).toEqual({ start: 2, endExclusive: 7 })
    expect(wordExtentAtChunkOffset('Hello world', 2)).toEqual({ start: 0, endExclusive: 5 })
    expect(wordExtentAtChunkOffset('Hello world', 6)).toEqual({ start: 6, endExclusive: 11 })
  })

  it('firstWordRangeInChunk returns first non-whitespace token', () => {
    expect(firstWordRangeInChunk('  Hi there.')).toEqual({ relStart: 2, relEndExclusive: 4 })
    expect(firstWordRangeInChunk('   \n')).toBeNull()
  })

  it('currentWordRangeInChunk uses charLength when plausible', () => {
    const ev = { charIndex: 4, charLength: 5 } as SpeechSynthesisEvent
    expect(currentWordRangeInChunk('0123456789', ev)).toEqual({ relStart: 4, relEndExclusive: 9 })
  })

  it('currentWordRangeInChunk ignores oversized charLength and falls back to extent', () => {
    const ev = { charIndex: 0, charLength: 200 } as SpeechSynthesisEvent
    expect(currentWordRangeInChunk('Hi there', ev)).toEqual({ relStart: 0, relEndExclusive: 2 })
  })

  it('currentWordRangeInChunk falls back when charLength is zero', () => {
    const ev = { charIndex: 4, charLength: 0 } as SpeechSynthesisEvent
    expect(currentWordRangeInChunk('Hi there buddy', ev)).toEqual({ relStart: 3, relEndExclusive: 8 })
  })
})
