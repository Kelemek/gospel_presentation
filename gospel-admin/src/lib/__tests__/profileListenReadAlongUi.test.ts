import {
  readAlongProgressPlainOnBoundary,
  readAlongProgressPlainOnChunkStart,
  readAlongUiOnBoundary,
  readAlongUiOnChunkStart,
} from '@/lib/profileListenReadAlongUi'

describe('profileListenReadAlongUi', () => {
  const displayChunk = 'For God so loved the world.'
  const speakChunk = displayChunk
  const speakMap = Array.from({ length: speakChunk.length }, (_, i) => i)

  it('builds reduced-motion chunk-start highlight for the whole chunk', () => {
    expect(
      readAlongUiOnChunkStart({
        chunkStart: 10,
        displayChunk,
        speakChunk,
        speakMap,
        plainLen: 80,
        underlineEnabled: true,
        underlineStyle: 'word',
        reducedMotion: true,
      })
    ).toEqual({
      scroll: 10,
      highlight: { kind: 'word', start: 10, endExclusive: 10 + displayChunk.length },
    })
  })

  it('builds line-mode boundary highlight at the caret', () => {
    const patch = readAlongUiOnBoundary({
      chunkStart: 0,
      displayChunk,
      speakChunk,
      speakMap,
      plainLen: displayChunk.length,
      underlineEnabled: true,
      underlineStyle: 'line',
      reducedMotion: false,
      boundary: { charIndex: 8 },
    })
    expect(patch.scrollBehavior).toBe('auto')
    expect(patch.highlight?.kind).toBe('line')
  })

  it('tracks progress plain offset at first word on chunk start', () => {
    expect(
      readAlongProgressPlainOnChunkStart({
        chunkStart: 5,
        displayChunk,
        speakChunk,
        speakMap,
        plainLen: 100,
      })
    ).toBe(5)
  })

  it('tracks progress plain offset from boundary charIndex', () => {
    const offset = readAlongProgressPlainOnBoundary({
      chunkStart: 0,
      displayChunk,
      speakChunk,
      speakMap,
      plainLen: displayChunk.length,
      boundary: { charIndex: 4 },
    })
    expect(offset).toBeGreaterThanOrEqual(0)
    expect(offset).toBeLessThan(displayChunk.length)
  })
})
