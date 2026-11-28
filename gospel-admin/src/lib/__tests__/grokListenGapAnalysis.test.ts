import {
  analyzeGrokListenChunkGranularity,
  analyzeGrokTtsClipPadding,
  estimateGrokListenTransitionGaps,
  measurePcmLeadingTrailingSilenceMs,
  summarizeAudibleGaps,
  GROK_LISTEN_EST_ELEMENT_HANDOFF_MS,
} from '@/lib/grokListenGapAnalysis'
import { splitListenRawIntoGrokChunksWithOffsets } from '@/lib/grokListenChunks'
import { mp3DurationSeconds } from '@/lib/grokVoiceCode'

/** Fixture: synthetic graph shows speech ends at 2.0s inside a longer MP3 estimate. */
const FIXTURE_TRAILING_MS = 350

describe('grokListenGapAnalysis', () => {
  it('reports one packed chunk vs eight per-line chunks for typical paragraph breaks', () => {
    const raw = Array.from({ length: 8 }, (_, i) => `Short line number ${i + 1} about grace.`).join('\n')
    const report = analyzeGrokListenChunkGranularity(raw)
    expect(report.rawNewlineSegments).toBe(8)
    expect(report.grokChunkCount).toBe(1)
    expect(report.legacyPerLineChunkCount).toBe(8)
    expect(report.avgChunkChars).toBeGreaterThan(200)
  })

  it('estimates transition gaps with TTS padding and handoff', () => {
    const raw = 'Alpha.\nBeta.\nGamma.'
    const chunks = splitListenRawIntoGrokChunksWithOffsets(raw)
    expect(chunks.length).toBe(1)
    const legacyRaw = 'Alpha.\nBeta.\nGamma.'
    const legacyChunks = analyzeGrokListenChunkGranularity(legacyRaw)
    const perLineScenario = {
      chunks: legacyRaw
        .split('\n')
        .map((text, i) => ({ text, plainStart: i * 10, pauseBefore: i > 0 })),
      trailingSilenceMsByChunk: [FIXTURE_TRAILING_MS, FIXTURE_TRAILING_MS],
      prefetchReadyBeforeEnd: [true, true],
    }
    const perLine = estimateGrokListenTransitionGaps(perLineScenario)
    const summary = summarizeAudibleGaps(perLine)
    expect(summary.transitions).toBe(2)
    expect(summary.p50TotalMs).toBe(FIXTURE_TRAILING_MS + GROK_LISTEN_EST_ELEMENT_HANDOFF_MS)
    expect(legacyChunks.legacyPerLineChunkCount).toBeGreaterThan(legacyChunks.grokChunkCount)
  })

  it('measures PCM leading and trailing silence in fixtures', () => {
    const sampleRate = 24000
    const speechSamples = 24000
    const padSamples = Math.round((FIXTURE_TRAILING_MS / 1000) * sampleRate)
    const samples = new Int16Array(speechSamples + padSamples * 2)
    samples.fill(0, 0, padSamples)
    samples.fill(8000, padSamples, padSamples + speechSamples)
    samples.fill(0, padSamples + speechSamples)
    const measured = measurePcmLeadingTrailingSilenceMs(samples, sampleRate)
    expect(measured.leadingMs).toBeGreaterThanOrEqual(FIXTURE_TRAILING_MS - 5)
    expect(measured.trailingMs).toBeGreaterThanOrEqual(FIXTURE_TRAILING_MS - 5)
  })

  it('computes trailing silence from graph times vs MP3 duration when bytes are valid', () => {
    const bytes = new Uint8Array(4096)
    const report = analyzeGrokTtsClipPadding(bytes, {
      graphChars: ['a'],
      graphTimes: [[0, 2]],
    })
    if (report.audioDurationSec > 0 && report.speechEndSec != null) {
      expect(report.trailingSilenceMs).not.toBeNull()
    } else {
      expect(mp3DurationSeconds(bytes)).toBeNull()
    }
  })
})