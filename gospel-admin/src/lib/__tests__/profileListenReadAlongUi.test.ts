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

  it('uses instant scroll on chunk start while audio is playing', () => {
    const patch = readAlongUiOnChunkStart({
      chunkStart: 0,
      displayChunk,
      speakChunk,
      speakMap,
      plainLen: displayChunk.length,
      reducedMotion: false,
    })
    expect(patch.scrollBehavior).toBe('instant')
    expect(patch.scroll).toBeGreaterThanOrEqual(0)
    expect(patch).not.toHaveProperty('highlight')
  })

  it('reduced-motion chunk start scrolls to chunk start', () => {
    expect(
      readAlongUiOnChunkStart({
        chunkStart: 10,
        displayChunk,
        speakChunk,
        speakMap,
        plainLen: 80,
        reducedMotion: true,
      })
    ).toEqual({
      scroll: 10,
      scrollBehavior: 'instant',
    })
  })

  it('returns scroll-only boundary patches', () => {
    const patch = readAlongUiOnBoundary({
      chunkStart: 0,
      displayChunk,
      speakChunk,
      speakMap,
      plainLen: displayChunk.length,
      reducedMotion: false,
      boundary: { charIndex: 8 },
    })
    expect(patch.scrollBehavior).toBe('instant')
    expect(typeof patch.scroll).toBe('number')
    expect(patch).not.toHaveProperty('highlight')
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