import type { ProfileListenTextOptions } from '@/lib/profileHighlightVisibleText'
import {
  listenCollapsedPlainFromRaw,
  visibleListenRawText,
} from '@/lib/profileResourceListenText'
import {
  splitListenRawIntoTtsChunksWithOffsets,
  type TtsTextChunk,
} from '@/lib/splitTextForTtsChunks'
import { buildBibleReferenceSpeakChunk } from '@/lib/bibleReferenceSpeechTransform'

/** After chunks ending in `.` `!` `?`, brief delay before the next utterance so engines do not run sentences together. */
export const READ_ALONG_AFTER_SENTENCE_GAP_MS = 55
/** After a listen **segment** (block boundary), brief delay before the next utterance. */
export const READ_ALONG_AFTER_SEGMENT_GAP_MS = 95

export function listenPlainAndChunksForScope(scope: HTMLElement, listenTextOptions: ProfileListenTextOptions) {
  const raw = visibleListenRawText(scope, listenTextOptions)
  const text = listenCollapsedPlainFromRaw(raw)
  const chunks = splitListenRawIntoTtsChunksWithOffsets(raw)
  return { text, chunks }
}

export type ProfileListenChunkQueueLayers = {
  displayChunks: string[]
  speakChunks: string[]
  speakCharToDisplayChar: number[][]
  plainStarts: number[]
  pauseBeforeChunk: boolean[]
}

export function buildProfileListenChunkQueueLayers(
  chunkMeta: TtsTextChunk[]
): ProfileListenChunkQueueLayers {
  const displayChunks = chunkMeta.map((c) => c.text)
  const speakLayers = displayChunks.map((t) => buildBibleReferenceSpeakChunk(t))
  return {
    displayChunks,
    speakChunks: speakLayers.map((l) => l.speakText),
    speakCharToDisplayChar: speakLayers.map((l) => l.speakCharToDisplayCharIndex),
    plainStarts: chunkMeta.map((c) => c.plainStart),
    pauseBeforeChunk: chunkMeta.map((c) => Boolean(c.pauseBefore)),
  }
}
