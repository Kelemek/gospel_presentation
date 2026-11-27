import { displayCharIndexInChunkForSpeakIndex } from '@/lib/bibleReferenceSpeechTransform'
import type { GospelListenSpeechBoundaryEvent } from '@/lib/gospelListenSpeechEngine'

export type GrokAudioTimestampTracks = {
  graphChars: string[]
  graphTimes: number[][]
}

export type GrokListenBoundary = GospelListenSpeechBoundaryEvent & {
  startSec: number
}

/**
 * Word starts in `speakText` (the bible-reference speech form sent to xAI).
 * `graph_times[i]` is the start of speak character `i`. Callers map `charIndex`
 * through `speakCharToDisplayCharIndex` for read-along on the display text.
 */
export function boundaryEventsFromGrokTimestamps(
  speakText: string,
  tracks: GrokAudioTimestampTracks | undefined
): GrokListenBoundary[] {
  if (!speakText || !tracks) return []
  const events: GrokListenBoundary[] = []
  const word = /\S+/g
  let match: RegExpExecArray | null
  while ((match = word.exec(speakText))) {
    const charIndex = match.index
    const time = tracks.graphTimes[charIndex]
    const start = Array.isArray(time) ? time[0] : undefined
    if (typeof start !== 'number' || !Number.isFinite(start)) continue
    events.push({
      charIndex,
      charLength: match[0].length,
      startSec: start,
    })
  }
  return events
}

export function displayCharForGrokBoundary(
  boundary: GospelListenSpeechBoundaryEvent,
  speakCharToDisplayCharIndex: number[],
  displayChunkLength: number
): number {
  return displayCharIndexInChunkForSpeakIndex(
    boundary.charIndex,
    speakCharToDisplayCharIndex,
    displayChunkLength
  )
}
