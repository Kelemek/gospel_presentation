import { audioSecondsFromGraphTimes, mp3DurationSeconds } from '@/lib/grokVoiceCode'
import type { GrokAudioTimestampTracks } from '@/lib/grokListenTimestamps'
import {
  computeProfileListenInterChunkGapMs,
} from '@/lib/profileListenChunkPlayback'
import { GROK_LISTEN_PREFETCH_AHEAD } from '@/lib/grokResourceListenPlayer'
import { listenCollapsedPlainFromRaw } from '@/lib/profileResourceListenText'
import { splitListenRawIntoGrokChunksWithOffsets } from '@/lib/grokListenChunks'
import type { TtsTextChunk } from '@/lib/splitTextForTtsChunks'

/** Typical iOS Safari HTMLAudioElement `play()` start after a warmed blob URL (lab estimates). */
export const GROK_LISTEN_EST_HTML_AUDIO_PLAY_START_MS = 45

/** Typical gap when swapping elements at `timeupdate` / `ended` boundary (lab estimates). */
export const GROK_LISTEN_EST_ELEMENT_HANDOFF_MS = 25

export type GrokListenChunkGranularityReport = {
  rawNewlineSegments: number
  collapsedPlainChars: number
  grokChunkCount: number
  /** Chunks if each `\\n` block were split separately (pre-fix behavior). */
  legacyPerLineChunkCount: number
  avgChunkChars: number
  chunkCharLengths: number[]
}

/**
 * Documents how often Grok must chain audio when profile body uses block-level newlines in raw listen text.
 */
/** Pre-020e1b5 behavior: one Grok fetch per raw newline segment (short paragraphs). */
function grokChunksLegacyPerNewlineSegment(raw: string): TtsTextChunk[] {
  const segments = raw.split('\n').map((segment) => segment.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const out: TtsTextChunk[] = []
  let globalPlain = 0
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si]!
    out.push({
      text: seg,
      plainStart: globalPlain,
      pauseBefore: si > 0,
    })
    globalPlain += seg.length
    if (si < segments.length - 1) globalPlain += 1
  }
  return out
}

export function analyzeGrokListenChunkGranularity(raw: string): GrokListenChunkGranularityReport {
  const segments = raw.split('\n').map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const collapsed = listenCollapsedPlainFromRaw(raw)
  const chunks = splitListenRawIntoGrokChunksWithOffsets(raw)
  const legacy = grokChunksLegacyPerNewlineSegment(raw)
  const lengths = chunks.map((c) => c.text.length)
  const sum = lengths.reduce((a, b) => a + b, 0)
  return {
    rawNewlineSegments: segments.length,
    collapsedPlainChars: collapsed.length,
    grokChunkCount: chunks.length,
    legacyPerLineChunkCount: legacy.length,
    avgChunkChars: chunks.length > 0 ? Math.round(sum / chunks.length) : 0,
    chunkCharLengths: lengths,
  }
}

export type GrokListenTtsPaddingReport = {
  audioDurationSec: number
  speechEndSec: number | null
  trailingSilenceMs: number | null
  leadingSilenceMs: unknown
}

/** Compare decoded MP3 duration to the last xAI graph timestamp end (speech vs file tail). */
export function analyzeGrokTtsClipPadding(
  audioBytes: Uint8Array,
  audioTimestamps?: GrokAudioTimestampTracks | null
): GrokListenTtsPaddingReport {
  const audioDurationSec = mp3DurationSeconds(audioBytes)
  const speechEndSec =
    audioTimestamps && audioTimestamps.graphTimes.length > 0
      ? audioSecondsFromGraphTimes(audioTimestamps.graphTimes)
      : null
  const trailingSilenceMs =
    audioDurationSec != null && speechEndSec != null
      ? Math.max(0, Math.round((audioDurationSec - speechEndSec) * 1000))
      : null
  return {
    audioDurationSec: audioDurationSec ?? 0,
    speechEndSec,
    trailingSilenceMs,
    leadingSilenceMs: 'requires_pcm_decode',
  }
}

export type GrokListenTransitionEstimate = {
  chunkIndex: number
  intentionalGapMs: number
  estimatedTtsTrailingMs: number | null
  estimatedHandoffMs: number
  estimatedTotalAudibleGapMs: number
  prefetchQueueDepth: number
  nextChunkReady: boolean
}

export type GrokListenPipelineScenario = {
  chunks: TtsTextChunk[]
  /** Trailing silence ms per chunk index (from measurement or fixture). */
  trailingSilenceMsByChunk: number[]
  /** Whether chunk i+1 was warmed before chunk i ended. */
  prefetchReadyBeforeEnd: boolean[]
}

/**
 * Offline model of audible gaps between Grok chunks (no network). Used in tests and the analysis doc.
 */
export function estimateGrokListenTransitionGaps(scenario: GrokListenPipelineScenario): GrokListenTransitionEstimate[] {
  const { chunks, trailingSilenceMsByChunk, prefetchReadyBeforeEnd } = scenario
  const out: GrokListenTransitionEstimate[] = []
  for (let i = 0; i < chunks.length - 1; i++) {
    const displayChunk = chunks[i]!.text
    const intentionalGapMs = computeProfileListenInterChunkGapMs(
      displayChunk,
      i + 1,
      chunks.length,
      chunks.map((c) => Boolean(c.pauseBefore)),
      { grok: true }
    )
    const trailing = trailingSilenceMsByChunk[i] ?? 0
    const handoff =
      prefetchReadyBeforeEnd[i] === true
        ? GROK_LISTEN_EST_ELEMENT_HANDOFF_MS
        : GROK_LISTEN_EST_ELEMENT_HANDOFF_MS + 120
    const prefetchDepth = Math.min(
      GROK_LISTEN_PREFETCH_AHEAD,
      Math.max(0, chunks.length - 1 - i)
    )
    out.push({
      chunkIndex: i,
      intentionalGapMs,
      estimatedTtsTrailingMs: trailing,
      estimatedHandoffMs: handoff,
      estimatedTotalAudibleGapMs: intentionalGapMs + trailing + handoff,
      prefetchQueueDepth: prefetchDepth,
      nextChunkReady: prefetchReadyBeforeEnd[i] === true,
    })
  }
  return out
}

/** RMS silence threshold for 16-bit PCM fixtures (test-only). */
export function measurePcmLeadingTrailingSilenceMs(
  samples: Int16Array,
  sampleRateHz: number,
  threshold = 120
): { leadingMs: number; trailingMs: number; durationMs: number } {
  const msPerSample = 1000 / sampleRateHz
  let leading = 0
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]!) > threshold) break
    leading += 1
  }
  let trailing = 0
  for (let i = samples.length - 1; i >= 0; i--) {
    if (Math.abs(samples[i]!) > threshold) break
    trailing += 1
  }
  const durationMs = samples.length * msPerSample
  return {
    leadingMs: Math.round(leading * msPerSample),
    trailingMs: Math.round(trailing * msPerSample),
    durationMs: Math.round(durationMs),
  }
}

export function summarizeAudibleGaps(estimates: GrokListenTransitionEstimate[]): {
  transitions: number
  p50TotalMs: number
  p90TotalMs: number
  maxTotalMs: number
} {
  if (estimates.length === 0) {
    return { transitions: 0, p50TotalMs: 0, p90TotalMs: 0, maxTotalMs: 0 }
  }
  const sorted = estimates.map((e) => e.estimatedTotalAudibleGapMs).sort((a, b) => a - b)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]!
  const p90 = sorted[Math.floor(sorted.length * 0.9)]!
  return {
    transitions: estimates.length,
    p50TotalMs: p50,
    p90TotalMs: p90,
    maxTotalMs: sorted[sorted.length - 1]!,
  }
}