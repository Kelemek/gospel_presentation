import type { ProfileReadAlongLastSessionV1, ProfileReadAlongProgressV1 } from '@/lib/profileReadAlongProgressStorage'
import { readAlongTextFingerprint } from '@/lib/profileReadAlongProgressStorage'
import {
  buildProfileListenChunkQueueLayers,
  READ_ALONG_AFTER_SEGMENT_GAP_MS,
  READ_ALONG_AFTER_SENTENCE_GAP_MS,
  type ProfileListenChunkQueueLayers,
} from '@/lib/profileListenChunkQueue'
import { chunkIndexContainingPlainOffset, type TtsTextChunk } from '@/lib/splitTextForTtsChunks'

export type ProfileListenChunkSpeakPayload = {
  displayChunk: string
  speakChunk: string
  speakMap: number[]
}

export function resolveProfileListenChunkSpeakPayload(
  layers: ProfileListenChunkQueueLayers,
  chunkIndex: number
): ProfileListenChunkSpeakPayload | null {
  const displayChunk = layers.displayChunks[chunkIndex]
  if (!displayChunk) return null

  const speakChunkStored = layers.speakChunks[chunkIndex]
  const speakMapStored = layers.speakCharToDisplayChar[chunkIndex]
  const speakChunk =
    speakChunkStored &&
    speakMapStored &&
    speakMapStored.length === speakChunkStored.length &&
    speakChunkStored.length > 0
      ? speakChunkStored
      : displayChunk
  const speakMap: number[] =
    speakMapStored && speakMapStored.length === speakChunk.length
      ? speakMapStored
      : Array.from({ length: speakChunk.length }, (_, i) => i)

  return { displayChunk, speakChunk, speakMap }
}

export function computeProfileListenInterChunkGapMs(
  displayChunk: string,
  nextChunkIndex: number,
  totalChunks: number,
  pauseBeforeChunk: boolean[]
): number {
  const hasMore = nextChunkIndex < totalChunks
  const trimmedEnd = displayChunk.trimEnd()
  const afterFullStop = hasMore && /[.!?]['"]?$/.test(trimmedEnd)
  const segmentPause = hasMore && pauseBeforeChunk[nextChunkIndex] === true
  return Math.max(
    afterFullStop ? READ_ALONG_AFTER_SENTENCE_GAP_MS : 0,
    segmentPause ? READ_ALONG_AFTER_SEGMENT_GAP_MS : 0
  )
}

export function resolveProfileListenStartChunk(options: {
  fromBeginning: boolean
  forcedStartPlainOffset?: number
  plainTextLength: number
  chunkMeta: TtsTextChunk[]
  savedProgress?: ProfileReadAlongProgressV1 | null
  fingerprint: string
}): { startChunk: number; startPlainOffset: number } {
  const { fromBeginning, forcedStartPlainOffset, plainTextLength, chunkMeta, savedProgress, fingerprint } =
    options

  if (forcedStartPlainOffset !== undefined) {
    const offset = Math.max(0, Math.min(forcedStartPlainOffset, plainTextLength))
    return {
      startChunk: chunkIndexContainingPlainOffset(chunkMeta, offset),
      startPlainOffset: offset,
    }
  }

  if (
    !fromBeginning &&
    savedProgress &&
    savedProgress.fingerprint === fingerprint &&
    savedProgress.plainOffset > 0 &&
    savedProgress.plainOffset < plainTextLength
  ) {
    return {
      startChunk: chunkIndexContainingPlainOffset(chunkMeta, savedProgress.plainOffset),
      startPlainOffset: savedProgress.plainOffset,
    }
  }

  return { startChunk: 0, startPlainOffset: 0 }
}

export function shouldResumeProfileListenFromLastSession(options: {
  last: ProfileReadAlongLastSessionV1
  scrollAnchorId: string
  lastAnchorText: string
}): { anchorId: string; plainOffset: number; fingerprint: string } | null {
  const { last, scrollAnchorId, lastAnchorText } = options
  const fp = readAlongTextFingerprint(lastAnchorText)
  const offsetOk = last.plainOffset >= 0 && last.plainOffset < lastAnchorText.length
  const fpOk = lastAnchorText.length > 0 && last.fingerprint === fp
  const useOtherAnchor = last.anchorId !== scrollAnchorId
  const midProgress = last.plainOffset > 0
  if (!fpOk || !offsetOk || !(useOtherAnchor || midProgress)) {
    return null
  }
  return {
    anchorId: last.anchorId,
    plainOffset: last.plainOffset,
    fingerprint: last.fingerprint,
  }
}

export function shouldMarkProfilePresentationReadComplete(options: {
  profileSlug?: string
  anchorDone: string | null
  hasNextListenableScope: boolean
}): boolean {
  const { profileSlug, anchorDone, hasNextListenableScope } = options
  return Boolean(profileSlug && anchorDone && !hasNextListenableScope)
}

export type ProfileListenQueueAdvanceTarget = {
  anchorId: string
  text: string
  fingerprint: string
  layers: ProfileListenChunkQueueLayers
}

export type ProfileListenQueueCompletionResult =
  | { kind: 'advance'; target: ProfileListenQueueAdvanceTarget }
  | { kind: 'markReadComplete'; profileSlug: string }
  | { kind: 'idle' }

/** Pure decision after the final chunk of a queue finishes (DOM lookup happens in the hook). */
export function resolveProfileListenQueueCompletion(options: {
  profileSlug?: string
  anchorDone: string | null
  nextScope: { anchorId: string; text: string; chunkMeta: TtsTextChunk[] } | null
}): ProfileListenQueueCompletionResult {
  const { profileSlug, anchorDone, nextScope } = options

  if (nextScope && nextScope.chunkMeta.length > 0) {
    const fingerprint = readAlongTextFingerprint(nextScope.text)
    const layers = buildProfileListenChunkQueueLayers(nextScope.chunkMeta)
    return {
      kind: 'advance',
      target: {
        anchorId: nextScope.anchorId,
        text: nextScope.text,
        fingerprint,
        layers,
      },
    }
  }

  if (
    profileSlug &&
    shouldMarkProfilePresentationReadComplete({
      profileSlug,
      anchorDone,
      hasNextListenableScope: false,
    })
  ) {
    return { kind: 'markReadComplete', profileSlug }
  }

  return { kind: 'idle' }
}
