import {
  buildProfileListenChunkQueueLayers,
  READ_ALONG_AFTER_SEGMENT_GAP_MS,
  READ_ALONG_AFTER_SENTENCE_GAP_MS,
} from '@/lib/profileListenChunkQueue'

describe('profileListenChunkQueue', () => {
  it('builds speak layers that expand bible references for TTS', () => {
    const layers = buildProfileListenChunkQueueLayers([
      { text: 'See John 3:16 for more.', plainStart: 0 },
      { text: 'Next paragraph.', plainStart: 24, pauseBefore: true },
    ])
    expect(layers.displayChunks).toEqual(['See John 3:16 for more.', 'Next paragraph.'])
    expect(layers.speakChunks[0]).toContain('verse')
    expect(layers.plainStarts).toEqual([0, 24])
    expect(layers.pauseBeforeChunk).toEqual([false, true])
    expect(layers.speakCharToDisplayChar[0]!.length).toBe(layers.speakChunks[0]!.length)
  })

  it('exports read-along gap constants', () => {
    expect(READ_ALONG_AFTER_SENTENCE_GAP_MS).toBeGreaterThan(0)
    expect(READ_ALONG_AFTER_SEGMENT_GAP_MS).toBeGreaterThan(READ_ALONG_AFTER_SENTENCE_GAP_MS)
  })
})
