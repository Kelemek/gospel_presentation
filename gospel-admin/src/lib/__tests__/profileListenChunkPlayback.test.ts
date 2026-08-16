import {
  computeProfileListenInterChunkGapMs,
  resolveProfileListenChunkSpeakPayload,
  resolveProfileListenQueueCompletion,
  resolveProfileListenStartChunk,
  shouldMarkProfilePresentationReadComplete,
  shouldResumeProfileListenFromLastSession,
} from '@/lib/profileListenChunkPlayback'
import {
  buildProfileListenChunkQueueLayers,
  READ_ALONG_AFTER_SEGMENT_GAP_MS,
  READ_ALONG_AFTER_SENTENCE_GAP_MS,
} from '@/lib/profileListenChunkQueue'
import { readAlongTextFingerprint } from '@/lib/profileReadAlongProgressStorage'

describe('profileListenChunkPlayback', () => {
  const layers = buildProfileListenChunkQueueLayers([
    { text: 'First sentence.', plainStart: 0 },
    { text: 'Second block.', plainStart: 16, pauseBefore: true },
  ])

  it('resolves speak payload with bible-reference speak layers', () => {
    const bibleLayers = buildProfileListenChunkQueueLayers([
      { text: 'See John 3:16.', plainStart: 0 },
    ])
    const payload = resolveProfileListenChunkSpeakPayload(bibleLayers, 0)
    expect(payload?.displayChunk).toBe('See John 3:16.')
    expect(payload?.speakChunk).toContain('verse')
    expect(payload?.speakMap).toHaveLength(payload!.speakChunk.length)
  })

  it('returns null for missing chunk index', () => {
    expect(resolveProfileListenChunkSpeakPayload(layers, 99)).toBeNull()
  })

  it('computes sentence and segment gaps between chunks', () => {
    expect(
      computeProfileListenInterChunkGapMs('First sentence.', 1, 2, layers.pauseBeforeChunk)
    ).toBe(Math.max(READ_ALONG_AFTER_SENTENCE_GAP_MS, READ_ALONG_AFTER_SEGMENT_GAP_MS))
    expect(computeProfileListenInterChunkGapMs('No stop', 1, 2, [false, false])).toBe(0)
  })

  it('resolves start chunk from saved progress', () => {
    const chunkMeta = [
      { text: 'Alpha.', plainStart: 0 },
      { text: 'Beta.', plainStart: 6 },
    ]
    const result = resolveProfileListenStartChunk({
      fromBeginning: false,
      plainTextLength: 11,
      chunkMeta,
      fingerprint: '11:abc',
      savedProgress: { v: 1, plainOffset: 7, fingerprint: '11:abc' },
    })
    expect(result.startChunk).toBe(1)
    expect(result.startPlainOffset).toBe(7)
  })

  it('resumes from last session on another anchor when mid-progress', () => {
    const lastAnchorText = 'Saved subsection text here.'
    const fp = readAlongTextFingerprint(lastAnchorText)
    const resume = shouldResumeProfileListenFromLastSession({
      last: { v: 1, anchorId: 'section-1-1', plainOffset: 12, fingerprint: fp },
      scrollAnchorId: 'section-1-0',
      lastAnchorText,
    })
    expect(resume).toEqual({
      anchorId: 'section-1-1',
      plainOffset: 12,
      fingerprint: fp,
    })
  })

  it('marks presentation read complete only when no next scope remains', () => {
    expect(
      shouldMarkProfilePresentationReadComplete({
        profileSlug: 'demo',
        anchorDone: 'section-9',
        hasNextListenableScope: false,
      })
    ).toBe(true)
    expect(
      shouldMarkProfilePresentationReadComplete({
        profileSlug: 'demo',
        anchorDone: 'section-9',
        hasNextListenableScope: true,
      })
    ).toBe(false)
  })

  it('resolves queue completion to advance when next scope has chunks', () => {
    const nextText = 'Next subsection text.'
    const chunkMeta = [{ text: 'Next subsection text.', plainStart: 0 }]
    const result = resolveProfileListenQueueCompletion({
      profileSlug: 'demo',
      anchorDone: 'section-1',
      nextScope: { anchorId: 'section-2', text: nextText, chunkMeta },
    })
    expect(result.kind).toBe('advance')
    if (result.kind !== 'advance') return
    expect(result.target.anchorId).toBe('section-2')
    expect(result.target.fingerprint).toBe(readAlongTextFingerprint(nextText))
    expect(result.target.layers.displayChunks).toHaveLength(1)
  })

  it('resolves queue completion to mark read complete when no next scope', () => {
    const result = resolveProfileListenQueueCompletion({
      profileSlug: 'demo',
      anchorDone: 'section-final',
      nextScope: null,
    })
    expect(result).toEqual({ kind: 'markReadComplete', profileSlug: 'demo' })
  })

  it('resolves queue completion to idle when anchor or slug missing', () => {
    expect(
      resolveProfileListenQueueCompletion({
        profileSlug: 'demo',
        anchorDone: null,
        nextScope: null,
      })
    ).toEqual({ kind: 'idle' })
    expect(
      resolveProfileListenQueueCompletion({
        profileSlug: undefined,
        anchorDone: 'section-1',
        nextScope: { anchorId: 'section-2', text: 'x', chunkMeta: [] },
      })
    ).toEqual({ kind: 'idle' })
  })
})
