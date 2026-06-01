import {
  preferLaterEquivalentListenTextBoundary,
  type ProfileListenTextOptions,
} from '@/lib/profileHighlightVisibleText'
import { listenCollapsedPlainFromRaw, locateListenRawTextOffset, visibleListenRawText } from '@/lib/profileResourceListenText'

/**
 * Maps a **collapsed** offset (same string as {@link plainTextForProfileResourceListen}) into a
 * **raw listen-stream** index: concatenation of eligible `Text` nodes (no mounts/buttons), before
 * `\s+ → ` ` collapse. Using proportional scaling (`plainLen` vs walkerLen) drifts badly on WebKit
 * when block boundaries add/remove implicit whitespace vs `innerText`; this walk stays aligned with
 * what is spoken.
 */
export function walkerOffsetForReadAlongPlainOffset(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  listenTextOptions?: ProfileListenTextOptions
): number {
  const raw = visibleListenRawText(scope, listenTextOptions)
  const full = listenCollapsedPlainFromRaw(raw)
  const L = full.length
  if (L === 0 || plainCollapsedLen <= 0) return 0

  const target = Math.max(0, Math.min(plainOffset, L))
  if (target >= L) return raw.length

  let wi = 0
  while (wi < raw.length && /\s/.test(raw[wi]!)) wi += 1

  let pi = 0
  const maxSteps = raw.length + L + 8
  let steps = 0
  while (pi < target && wi < raw.length && steps++ < maxSteps) {
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

  return Math.min(wi, raw.length)
}

export function prefersReducedMotionReadAlong(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function readAlongComfortTopMarginPx(win: Window): number {
  let safeTop = 0
  try {
    const vv = win.visualViewport
    if (vv && vv.offsetTop > 0) safeTop = Math.max(safeTop, vv.offsetTop)
  } catch {
    /* ignore */
  }
  /** ~sticky header (`scroll-mt-20` / toolbar) + padding below Listen bar when floating. */
  return Math.round(Math.max(100, safeTop + 76))
}

function readAlongComfortBottomMarginPx(win: Window): number {
  let inset = 0
  try {
    const vv = win.visualViewport
    if (vv) {
      const gap = win.innerHeight - vv.height - vv.offsetTop
      if (gap > 0) inset = Math.max(inset, gap)
    }
  } catch {
    /* ignore */
  }
  /** Extra space above home indicator / browser chrome; larger → scroll kicks in sooner so lines sit higher. */
  return Math.round(Math.max(130, inset + 92))
}

/**
 * Pure helper: how far to `window.scrollBy({ top })` so a caret rect stays inside top/bottom margins.
 * Prefer fixing bottom overflow (reading forward / line wrap) before top overflow.
 */
export function computeReadAlongVerticalScrollDeltaForComfortZone(
  caretRect: Pick<DOMRectReadOnly, 'top' | 'bottom'>,
  viewportHeight: number,
  topMarginPx: number,
  bottomMarginPx: number
): number {
  const zoneBottom = viewportHeight - bottomMarginPx
  if (caretRect.top >= topMarginPx && caretRect.bottom <= zoneBottom) {
    return 0
  }
  if (caretRect.bottom > zoneBottom) {
    return caretRect.bottom - zoneBottom
  }
  if (caretRect.top < topMarginPx) {
    return caretRect.top - topMarginPx
  }
  return 0
}

export function getCaretClientRectForReadAlongPlainOffset(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  listenTextOptions?: ProfileListenTextOptions
): DOMRect | null {
  const walkerOff = walkerOffsetForReadAlongPlainOffset(
    scope,
    plainCollapsedLen,
    plainOffset,
    listenTextOptions
  )
  let pos = locateListenRawTextOffset(scope, walkerOff, listenTextOptions)
  if (!pos) return null
  pos = preferLaterEquivalentListenTextBoundary(scope, pos, listenTextOptions)

  const doc = scope.ownerDocument
  const r = doc.createRange()
  try {
    r.setStart(pos.node, pos.offset)
    r.collapse(true)
  } catch {
    return null
  }

  const rect = r.getBoundingClientRect()
  if (rect.height === 0 && rect.width === 0) return null
  return rect
}

/**
 * Scrolls the window only if the plain-text caret falls outside a comfortable band (below the sticky
 * header / safe area and above the bottom of the viewport). Word-by-word updates on the **same line**
 * therefore do not move the page; a **new line** or chunk that leaves the band still scrolls.
 */
export function scrollReadAlongPlainOffsetIntoViewIfNeeded(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  behavior: ScrollBehavior = 'auto',
  listenTextOptions?: ProfileListenTextOptions
): void {
  if (typeof window === 'undefined') return
  const win = scope.ownerDocument?.defaultView
  if (!win) return

  const rect = getCaretClientRectForReadAlongPlainOffset(
    scope,
    plainCollapsedLen,
    plainOffset,
    listenTextOptions
  )
  if (!rect) return

  const vpH = win.innerHeight
  const topM = readAlongComfortTopMarginPx(win)
  const botM = readAlongComfortBottomMarginPx(win)
  const delta = computeReadAlongVerticalScrollDeltaForComfortZone(rect, vpH, topM, botM)
  if (delta === 0) return
  win.scrollBy({ top: delta, behavior })
}

/** Pixel delta to align a caret's top edge to a viewport Y (e.g. profile reading line under the header). */
export function computeScrollDeltaToAlignCaretTopToViewportY(
  caretTop: number,
  targetTopPx: number,
  deadbandPx = 3
): number {
  const delta = caretTop - targetTopPx
  if (Math.abs(delta) <= deadbandPx) return 0
  return delta
}

/**
 * Scrolls the window so the plain-text caret sits on the same viewport line used when saving
 * reading position ({@link profileReadingPosition}), not the wide Listen read-along comfort band.
 */
export function scrollPlainOffsetToViewportY(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  targetTopPx: number,
  behavior: ScrollBehavior = 'auto',
  listenTextOptions?: ProfileListenTextOptions,
  deadbandPx = 3
): void {
  if (typeof window === 'undefined') return
  const win = scope.ownerDocument?.defaultView
  if (!win) return

  const rect = getCaretClientRectForReadAlongPlainOffset(
    scope,
    plainCollapsedLen,
    plainOffset,
    listenTextOptions
  )
  if (!rect) return

  const delta = computeScrollDeltaToAlignCaretTopToViewportY(rect.top, targetTopPx, deadbandPx)
  if (delta === 0) return
  win.scrollBy({ top: delta, behavior })
}

/**
 * Scrolls a scroll container (e.g. scripture modal pane) when the caret falls outside a comfort band,
 * or when `targetCaretFractionFromTop` is set, keeps the caret near that vertical position in the container.
 * Caret and container rects use viewport coordinates from `getBoundingClientRect`.
 */
export type ScrollReadAlongInContainerOptions = {
  topMarginPx?: number
  bottomMarginPx?: number
  /**
   * When set (0–1), scroll so the caret midline sits near this fraction of container height from the top
   * (e.g. `0.35` ≈ upper-center; `0.25` ≈ top quarter with most of the pane below for reading ahead).
   */
  targetCaretFractionFromTop?: number
  /** Ignore small deltas when using `targetCaretFractionFromTop`. */
  targetDeadbandPx?: number
  /**
   * Listen rAF loop: track every frame (no deadband pause) so scroll drifts continuously with playback.
   */
  continuous?: boolean
}

/** Scripture modal ESV listen: keep the read line high in the pane (below floating Listen bar). */
export const SCRIPTURE_LISTEN_AUTOSCROLL_OPTIONS: ScrollReadAlongInContainerOptions = {
  topMarginPx: 112,
  targetCaretFractionFromTop: 0.35,
  targetDeadbandPx: 28,
}

/** Same placement as {@link SCRIPTURE_LISTEN_AUTOSCROLL_OPTIONS}, tuned for rAF continuous drift. */
export const SCRIPTURE_LISTEN_CONTINUOUS_AUTOSCROLL_OPTIONS: ScrollReadAlongInContainerOptions = {
  ...SCRIPTURE_LISTEN_AUTOSCROLL_OPTIONS,
  continuous: true,
}

/** When `scrollTop` is within this distance of max, auto-scroll freezes (avoids attribution hop). */
export const SCRIPTURE_LISTEN_SCROLL_BOTTOM_EPSILON_PX = 2

/** Minimum change in `scrollTop` before writing during listen lerp. */
export const SCRIPTURE_LISTEN_SCROLL_MIN_DELTA_PX = 0.5

/** Per-frame lerp factor for scripture listen auto-scroll (when motion is allowed). */
export const SCRIPTURE_LISTEN_SCROLL_LERP_FACTOR = 0.12

export function getScrollContainerMaxScrollTop(scrollContainer: HTMLElement): number {
  return Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
}

export function isScrollContainerAtBottom(
  scrollContainer: HTMLElement,
  epsilon = SCRIPTURE_LISTEN_SCROLL_BOTTOM_EPSILON_PX
): boolean {
  const maxScrollTop = getScrollContainerMaxScrollTop(scrollContainer)
  if (maxScrollTop <= 0) return false
  return scrollContainer.scrollTop >= maxScrollTop - epsilon
}

/**
 * Absolute `scrollTop` to align the caret with listen options, or `null` when no adjustment is needed
 * (deadband, non-scrollable container, or already at the bottom of the pane).
 */
export function computeScriptureListenTargetScrollTop(
  scrollContainer: HTMLElement,
  caretRect: Pick<DOMRectReadOnly, 'top' | 'bottom'>,
  options: ScrollReadAlongInContainerOptions = {}
): number | null {
  const maxScrollTop = getScrollContainerMaxScrollTop(scrollContainer)
  if (maxScrollTop > 0 && isScrollContainerAtBottom(scrollContainer)) return null

  const currentScrollTop = scrollContainer.scrollTop
  const topMarginPx = options.topMarginPx ?? 56
  const bottomMarginPx = options.bottomMarginPx ?? 56
  const targetFraction = options.targetCaretFractionFromTop
  const deadbandPx = options.targetDeadbandPx ?? 24
  const continuous = options.continuous === true
  const minDeltaPx = continuous ? 0.01 : SCRIPTURE_LISTEN_SCROLL_MIN_DELTA_PX

  const containerRect = scrollContainer.getBoundingClientRect()

  let delta = 0

  if (targetFraction !== undefined) {
    const caretMid = (caretRect.top + caretRect.bottom) / 2
    const minTargetY = containerRect.top + topMarginPx
    const idealTargetY = containerRect.top + containerRect.height * targetFraction
    const targetY = Math.max(minTargetY, idealTargetY)
    delta = caretMid - targetY
    if (!continuous && Math.abs(delta) <= deadbandPx) return null
  } else {
    const zoneBottom = containerRect.bottom - bottomMarginPx
    const zoneTop = containerRect.top + topMarginPx

    if (caretRect.top >= zoneTop && caretRect.bottom <= zoneBottom) return null

    if (caretRect.bottom > zoneBottom) {
      delta = caretRect.bottom - zoneBottom
    } else if (caretRect.top < zoneTop) {
      delta = caretRect.top - zoneTop
    }
    if (delta === 0) return null
  }

  let targetScrollTop = currentScrollTop + delta
  if (maxScrollTop > 0) {
    targetScrollTop = Math.min(maxScrollTop, Math.max(0, targetScrollTop))
  }

  if (Math.abs(targetScrollTop - currentScrollTop) < minDeltaPx) {
    return null
  }

  return targetScrollTop
}

export function applyScriptureListenContinuousScrollTop(
  scrollContainer: HTMLElement,
  targetScrollTop: number
): void {
  if (Math.abs(targetScrollTop - scrollContainer.scrollTop) < 0.01) return
  scrollContainer.scrollTop = targetScrollTop
}

/** Map playback progress (0–1) to absolute scroll position through the full pane (incl. attribution). */
export function computeScriptureListenProportionalScrollTop(
  scrollContainer: HTMLElement,
  playbackFraction: number
): number {
  const maxScrollTop = getScrollContainerMaxScrollTop(scrollContainer)
  const fraction = Math.min(1, Math.max(0, playbackFraction))
  return fraction * maxScrollTop
}

/**
 * Advance integrated playback time between rAF frames (independent of sparse `timeupdate` events).
 * Stays aligned with `audioCurrentTimeSec` after seeks; never lags behind the audio clock.
 */
export function advanceScriptureListenIntegratedPlaybackTime(
  integratedTimeSec: number,
  audioCurrentTimeSec: number,
  durationSec: number,
  playbackRate: number,
  deltaSec: number
): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0

  let next = integratedTimeSec + deltaSec * playbackRate

  // Seek forward: follow the audio element clock
  if (audioCurrentTimeSec > integratedTimeSec + 0.15) {
    next = audioCurrentTimeSec
  }
  // Seek backward
  else if (audioCurrentTimeSec + 0.15 < integratedTimeSec) {
    next = audioCurrentTimeSec
  }

  return Math.min(durationSec, Math.max(0, next))
}

export function scrollReadAlongPlainInScrollContainerIfNeeded(
  scrollContainer: HTMLElement,
  caretRect: Pick<DOMRectReadOnly, 'top' | 'bottom'>,
  behavior: ScrollBehavior = 'auto',
  options: ScrollReadAlongInContainerOptions = {}
): void {
  const targetScrollTop = computeScriptureListenTargetScrollTop(scrollContainer, caretRect, options)
  if (targetScrollTop === null) return
  const delta = targetScrollTop - scrollContainer.scrollTop
  if (Math.abs(delta) < SCRIPTURE_LISTEN_SCROLL_MIN_DELTA_PX) return
  scrollContainer.scrollBy({ top: delta, behavior })
}
