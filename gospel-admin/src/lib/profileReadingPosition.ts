/**
 * Capture and restore reading position inside a profile TOC anchor (Listen plain-text model).
 */

import type { GospelSection } from '@/lib/types'
import { getCurrentTocAnchorId, getOrderedTocAnchorIds } from '@/lib/tocAnchorFromScroll'
import { readAlongTextFingerprint } from '@/lib/profileReadAlongProgressStorage'
import type { ProfileListenTextOptions } from '@/lib/profileHighlightVisibleText'
import { isListenPlainTextNodeExcluded } from '@/lib/profileHighlightVisibleText'
import {
  isListenOmitHeadingProfileSlug,
  listenCollapsedPlainFromRaw,
  listenNeedsImplicitBreak,
  plainTextForProfileResourceListen,
  visibleListenRawText,
} from '@/lib/profileResourceListenText'
import {
  getCaretClientRectForReadAlongPlainOffset,
  scrollPlainOffsetToViewportY,
} from '@/lib/scrollReadAlongPlain'
import { getProfileHeaderScrollOffset, scrollToTocAnchorWhenReady } from '@/lib/scrollToTocAnchor'

export const READING_POSITION_VIEWPORT_LINE_GAP_PX = 24

/** Viewport Y for the read line (capture and restore use the same value). */
export function profileReadingLineViewportY(): number {
  if (typeof window === 'undefined') return FALLBACK_PROFILE_READING_LINE_Y
  return getProfileHeaderScrollOffset() + READING_POSITION_VIEWPORT_LINE_GAP_PX
}

/** When header is not in DOM (tests). */
const FALLBACK_PROFILE_READING_LINE_Y = 104

const EXCERPT_RADIUS = 48
const EXCERPT_MAX_LEN = 96

export type ProfileReadingPositionCapture = {
  anchorId: string
  plainOffset: number
  fingerprint: string
  excerpt: string
}

export function listenTextOptionsForProfileSlug(slug: string): ProfileListenTextOptions {
  return { omitHeadingText: isListenOmitHeadingProfileSlug(slug.trim()) }
}

export function resolveReadingScope(anchorId: string): HTMLElement | null {
  if (typeof document === 'undefined') return null
  const el = document.getElementById(anchorId)
  return el instanceof HTMLElement ? el : null
}

function listenTextNodeIneligible(node: Text, root: HTMLElement, opts?: ProfileListenTextOptions): boolean {
  return isListenPlainTextNodeExcluded(node, root, opts)
}

/** Raw listen-stream offset immediately before `(boundaryNode, boundaryOffset)`. */
export function rawListenOffsetBeforeBoundary(
  scope: HTMLElement,
  boundaryNode: Node,
  boundaryOffset: number,
  opts?: ProfileListenTextOptions
): number {
  const doc = scope.ownerDocument
  if (!doc) return 0

  const boundary = doc.createRange()
  try {
    boundary.setStart(boundaryNode, boundaryOffset)
    boundary.collapse(true)
  } catch {
    return 0
  }

  let position = 0
  let prevEligible: Text | null = null
  const walker = doc.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (!(node instanceof Text) || listenTextNodeIneligible(node, scope, opts)) {
      node = walker.nextNode()
      continue
    }

    if (prevEligible && listenNeedsImplicitBreak(prevEligible, node, scope)) {
      const breakPos = doc.createRange()
      breakPos.setStart(node, 0)
      breakPos.collapse(true)
      const cmpBreak = boundary.compareBoundaryPoints(Range.START_TO_START, breakPos)
      if (cmpBreak <= 0) return position
      position += 1
    }

    const text = node.textContent ?? ''
    for (let i = 0; i < text.length; i += 1) {
      const charPos = doc.createRange()
      charPos.setStart(node, i)
      charPos.collapse(true)
      const cmp = boundary.compareBoundaryPoints(Range.START_TO_START, charPos)
      if (cmp <= 0) return position
      position += 1
    }

    prevEligible = node
    node = walker.nextNode()
  }

  return position
}

/** Maps a raw listen-stream index to collapsed plain offset (same string as TTS / read-along). */
export function collapsedPlainOffsetFromRawListenOffset(
  scope: HTMLElement,
  rawOffset: number,
  opts?: ProfileListenTextOptions
): number {
  const raw = visibleListenRawText(scope, opts)
  const full = listenCollapsedPlainFromRaw(raw)
  const L = full.length
  if (L === 0) return 0

  const target = Math.max(0, Math.min(rawOffset, raw.length))
  if (target >= raw.length) return L

  let wi = 0
  while (wi < raw.length && /\s/.test(raw[wi]!)) wi += 1

  let pi = 0
  const maxSteps = raw.length + L + 8
  let steps = 0
  while (wi < target && pi < L && steps++ < maxSteps) {
    const fc = full[pi]!
    if (fc === ' ') {
      while (wi < raw.length && /\s/.test(raw[wi]!)) wi += 1
      pi += 1
    } else {
      while (wi < raw.length && /\s/.test(raw[wi]!)) wi += 1
      if (wi >= raw.length) break
      if (raw[wi] !== fc) {
        wi += 1
        continue
      }
      wi += 1
      pi += 1
    }
  }

  return Math.min(pi, L)
}

export function collapsedPlainOffsetBeforeListenBoundary(
  scope: HTMLElement,
  boundaryNode: Node,
  boundaryOffset: number,
  opts?: ProfileListenTextOptions
): number {
  const rawOff = rawListenOffsetBeforeBoundary(scope, boundaryNode, boundaryOffset, opts)
  return collapsedPlainOffsetFromRawListenOffset(scope, rawOff, opts)
}

function caretRangeAtViewportReadLine(): Range | null {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null
  const y = profileReadingLineViewportY()
  const x = Math.round(window.innerWidth / 2)

  const doc = document
  if (typeof doc.caretRangeFromPoint === 'function') {
    try {
      return doc.caretRangeFromPoint(x, y)
    } catch {
      return null
    }
  }

  const pos = doc.caretPositionFromPoint?.(x, y)
  if (!pos) return null
  const range = doc.createRange()
  try {
    range.setStart(pos.offsetNode, pos.offset)
    range.collapse(true)
    return range
  } catch {
    return null
  }
}

function isNodeContainedInScope(node: Node, scope: HTMLElement): boolean {
  if (node === scope) return true
  const el = node instanceof Element ? node : node.parentElement
  return el != null && scope.contains(el)
}

/** Above this length, narrow binary search around a layout-based estimate (long CCEL sections). */
const PLAIN_LEN_APPROXIMATE_THRESHOLD = 12_000
const PLAIN_OFFSET_BINARY_SEARCH_MAX_ITER = 18
const PLAIN_OFFSET_REFINE_WINDOW_FRACTION = 1 / 24
const PLAIN_OFFSET_REFINE_WINDOW_MIN = 256

function approximatePlainOffsetAtViewportLine(scope: HTMLElement, plainLen: number): number {
  const targetY = profileReadingLineViewportY()
  const rect = scope.getBoundingClientRect()
  if (rect.height <= 0) return 0
  const fraction = (targetY - rect.top) / rect.height
  return Math.max(0, Math.min(plainLen, Math.round(fraction * plainLen)))
}

function binarySearchPlainOffsetInRange(
  scope: HTMLElement,
  plainLen: number,
  rangeLo: number,
  rangeHi: number,
  opts?: ProfileListenTextOptions
): number {
  if (plainLen <= 0) return 0
  const targetY = profileReadingLineViewportY()

  let lo = Math.max(0, rangeLo)
  let hi = Math.min(plainLen - 1, rangeHi)
  let best = lo
  let steps = 0

  while (lo <= hi && steps < PLAIN_OFFSET_BINARY_SEARCH_MAX_ITER) {
    steps += 1
    const mid = Math.floor((lo + hi) / 2)
    const rect = getCaretClientRectForReadAlongPlainOffset(scope, plainLen, mid, opts)
    if (!rect) {
      return Math.min(best, plainLen)
    }
    if (rect.top < targetY) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }

  return Math.min(best, plainLen)
}

function binarySearchPlainOffsetAtViewportLine(
  scope: HTMLElement,
  plainLen: number,
  opts?: ProfileListenTextOptions
): number {
  return binarySearchPlainOffsetInRange(scope, plainLen, 0, plainLen - 1, opts)
}

/**
 * Collapsed plain offset at the viewport read line inside `scope`, or best binary-search guess.
 */
export function getPlainOffsetAtViewportReadLine(
  scope: HTMLElement,
  opts?: ProfileListenTextOptions
): number {
  const plain = plainTextForProfileResourceListen(scope, opts)
  const plainLen = plain.length
  if (plainLen === 0) return 0

  const range = caretRangeAtViewportReadLine()
  if (range && isNodeContainedInScope(range.startContainer, scope)) {
    const off = collapsedPlainOffsetBeforeListenBoundary(
      scope,
      range.startContainer,
      range.startOffset,
      opts
    )
    return Math.max(0, Math.min(off, plainLen))
  }

  if (plainLen > PLAIN_LEN_APPROXIMATE_THRESHOLD) {
    const approx = approximatePlainOffsetAtViewportLine(scope, plainLen)
    const window = Math.max(
      PLAIN_OFFSET_REFINE_WINDOW_MIN,
      Math.floor(plainLen * PLAIN_OFFSET_REFINE_WINDOW_FRACTION)
    )
    const lo = Math.max(0, approx - window)
    const hi = Math.min(plainLen - 1, approx + window)
    return binarySearchPlainOffsetInRange(scope, plainLen, lo, hi, opts)
  }

  return binarySearchPlainOffsetAtViewportLine(scope, plainLen, opts)
}

export function excerptAroundPlainOffset(plain: string, plainOffset: number): string {
  const len = plain.length
  if (len === 0) return ''
  const at = Math.max(0, Math.min(plainOffset, len - 1))
  const start = Math.max(0, at - EXCERPT_RADIUS)
  const end = Math.min(len, at + EXCERPT_RADIUS)
  let slice = plain.slice(start, end).replace(/\s+/g, ' ').trim()
  if (start > 0) slice = `…${slice}`
  if (end < len) slice = `${slice}…`
  if (slice.length > EXCERPT_MAX_LEN) {
    slice = `${slice.slice(0, EXCERPT_MAX_LEN - 1)}…`
  }
  return slice
}

/** Near document top, avoid expensive caret/binary-search work on long sections. */
const READING_CAPTURE_DOCUMENT_TOP_SCROLL_Y_PX = 8

export function captureReadingPositionAtViewport(
  sections: GospelSection[],
  profileSlug: string
): ProfileReadingPositionCapture | null {
  if (typeof window === 'undefined') return null
  const anchorId = getCurrentTocAnchorId(sections)
  if (!anchorId) return null

  const scope = resolveReadingScope(anchorId)
  if (!scope) return null

  const opts = listenTextOptionsForProfileSlug(profileSlug)
  const plain = plainTextForProfileResourceListen(scope, opts)
  if (!plain) return null

  const fingerprint = readAlongTextFingerprint(plain)
  const firstAnchorId = getOrderedTocAnchorIds(sections)[0]
  if (
    window.scrollY <= READING_CAPTURE_DOCUMENT_TOP_SCROLL_Y_PX &&
    firstAnchorId &&
    anchorId === firstAnchorId
  ) {
    return {
      anchorId,
      plainOffset: 0,
      fingerprint,
      excerpt: excerptAroundPlainOffset(plain, 0),
    }
  }

  const plainOffset = getPlainOffsetAtViewportReadLine(scope, opts)
  const excerpt = excerptAroundPlainOffset(plain, plainOffset)

  return { anchorId, plainOffset, fingerprint, excerpt }
}

export function isReadingPositionFingerprintValid(
  scope: HTMLElement,
  fingerprint: string,
  opts?: ProfileListenTextOptions
): boolean {
  const plain = plainTextForProfileResourceListen(scope, opts)
  if (!plain) return fingerprint === readAlongTextFingerprint('')
  return readAlongTextFingerprint(plain) === fingerprint
}

export type RestoreReadingPositionOptions = {
  behavior?: ScrollBehavior
  maxFrames?: number
  onDone?: () => void
  onGiveUp?: () => void
  preferSubsectionTitle?: boolean
}

/** Scroll to TOC anchor, then align plain offset at the viewport read line when fingerprint matches. */
export function restoreReadingPosition(
  anchorId: string,
  plainOffset: number,
  fingerprint: string,
  profileSlug: string,
  options?: RestoreReadingPositionOptions
): () => void {
  if (typeof window === 'undefined') return () => {}

  const opts = listenTextOptionsForProfileSlug(profileSlug)
  const behavior = options?.behavior ?? 'auto'

  return scrollToTocAnchorWhenReady(anchorId, {
    behavior,
    maxFrames: options?.maxFrames,
    preferSubsectionTitle: options?.preferSubsectionTitle,
    onGiveUp: options?.onGiveUp,
    onDone: () => {
      const scope = resolveReadingScope(anchorId)
      if (!scope) {
        options?.onDone?.()
        return
      }
      if (!isReadingPositionFingerprintValid(scope, fingerprint, opts)) {
        options?.onDone?.()
        return
      }
      const plain = plainTextForProfileResourceListen(scope, opts)
      const plainLen = plain.length
      if (plainLen === 0 || !Number.isFinite(plainOffset) || plainOffset < 0) {
        options?.onDone?.()
        return
      }
      // Offset 0 is the subsection start; scrollToTocAnchor already placed the anchor.
      // Fine alignment scrolls down from the document top and fights manual scroll-up.
      if (plainOffset === 0) {
        options?.onDone?.()
        return
      }
      const clamped = Math.max(0, Math.min(plainOffset, plainLen - 1))
      scrollPlainOffsetToViewportY(scope, plainLen, clamped, profileReadingLineViewportY(), behavior, opts)
      options?.onDone?.()
    },
  })
}
