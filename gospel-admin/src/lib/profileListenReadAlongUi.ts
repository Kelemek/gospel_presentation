import {
  displayCharIndexInChunkForSpeakIndex,
  displayCharRangeInChunkForSpeakRange,
} from '@/lib/bibleReferenceSpeechTransform'
import { currentWordRangeInChunk, firstWordRangeInChunk } from '@/lib/readAlongSpeechWordRange'
import type { GospelListenSpeechBoundaryEvent } from '@/lib/gospelListenSpeechEngine'
import { readAlongListenScrollBehavior } from '@/lib/scrollReadAlongPlain'

export type ProfileListenReadAlongUiPatch = {
  scroll?: number
  scrollBehavior?: ScrollBehavior
}

export function readAlongUiOnChunkStart(options: {
  chunkStart: number
  displayChunk: string
  speakChunk: string
  speakMap: number[]
  plainLen: number
  reducedMotion: boolean
}): ProfileListenReadAlongUiPatch {
  const { chunkStart, displayChunk, speakChunk, speakMap, plainLen, reducedMotion } = options

  if (plainLen <= 0) {
    return {}
  }

  if (reducedMotion) {
    return {
      scroll: chunkStart,
      scrollBehavior: readAlongListenScrollBehavior(),
    }
  }

  const fw = firstWordRangeInChunk(speakChunk)
  if (!fw) {
    return { scroll: chunkStart, scrollBehavior: readAlongListenScrollBehavior() }
  }

  const dr = displayCharRangeInChunkForSpeakRange(
    fw.relStart,
    fw.relEndExclusive,
    speakMap,
    displayChunk.length
  )
  const plainWordStart = chunkStart + dr.displayStart
  const plainWordEnd = chunkStart + dr.displayEndExclusive
  const mid = Math.floor((plainWordStart + plainWordEnd - 1) / 2)
  const plainOffset = Math.min(Math.max(0, plainLen - 1), Math.max(chunkStart, mid))

  return {
    scroll: plainOffset,
    scrollBehavior: readAlongListenScrollBehavior(),
  }
}

export function readAlongUiOnBoundary(options: {
  chunkStart: number
  displayChunk: string
  speakChunk: string
  speakMap: number[]
  plainLen: number
  reducedMotion: boolean
  boundary: GospelListenSpeechBoundaryEvent
}): ProfileListenReadAlongUiPatch {
  const {
    chunkStart,
    displayChunk,
    speakChunk,
    speakMap,
    plainLen,
    reducedMotion,
    boundary,
  } = options

  if (plainLen <= 0) {
    return {}
  }

  const ci = typeof boundary.charIndex === 'number' ? boundary.charIndex : 0
  const inChunkSpeak = Math.max(0, Math.min(ci, speakChunk.length))
  const displayInChunk = displayCharIndexInChunkForSpeakIndex(inChunkSpeak, speakMap, displayChunk.length)
  const clampedTarget = Math.min(Math.max(0, plainLen - 1), chunkStart + displayInChunk)

  const wr = currentWordRangeInChunk(speakChunk, boundary)
  let progressPlain: number
  if (wr) {
    const drp = displayCharRangeInChunkForSpeakRange(
      wr.relStart,
      wr.relEndExclusive,
      speakMap,
      displayChunk.length
    )
    progressPlain = Math.min(Math.max(0, plainLen - 1), chunkStart + drp.displayStart)
  } else {
    progressPlain = clampedTarget
  }

  if (reducedMotion) {
    return { scroll: progressPlain, scrollBehavior: readAlongListenScrollBehavior() }
  }

  if (wr) {
    const speakMid = Math.floor((wr.relStart + wr.relEndExclusive - 1) / 2)
    const dispMid = displayCharIndexInChunkForSpeakIndex(speakMid, speakMap, displayChunk.length)
    const scrollMid = Math.min(Math.max(0, plainLen - 1), chunkStart + dispMid)
    return {
      scroll: scrollMid,
      scrollBehavior: readAlongListenScrollBehavior(),
    }
  }

  return {
    scroll: progressPlain,
    scrollBehavior: readAlongListenScrollBehavior(),
  }
}

export function readAlongProgressPlainOnChunkStart(options: {
  chunkStart: number
  displayChunk: string
  speakChunk: string
  speakMap: number[]
  plainLen: number
}): number {
  const { chunkStart, displayChunk, speakChunk, speakMap, plainLen } = options
  if (plainLen <= 0) return chunkStart
  const fw = firstWordRangeInChunk(speakChunk)
  if (!fw) return chunkStart
  const dr = displayCharRangeInChunkForSpeakRange(
    fw.relStart,
    fw.relEndExclusive,
    speakMap,
    displayChunk.length
  )
  return Math.min(Math.max(0, plainLen - 1), chunkStart + dr.displayStart)
}

export function readAlongProgressPlainOnBoundary(options: {
  chunkStart: number
  displayChunk: string
  speakChunk: string
  speakMap: number[]
  plainLen: number
  boundary: GospelListenSpeechBoundaryEvent
}): number {
  const patch = readAlongUiOnBoundary({
    ...options,
    reducedMotion: true,
  })
  return patch.scroll ?? options.chunkStart
}