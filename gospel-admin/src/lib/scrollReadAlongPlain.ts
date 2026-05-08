import {
  locateListenVisibleTextOffset,
  preferLaterEquivalentListenTextBoundary,
} from '@/lib/profileHighlightVisibleText'
import { visibleListenRawText } from '@/lib/profileResourceListenText'

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
  plainOffset: number
): number {
  const raw = visibleListenRawText(scope)
  const full = raw.replace(/\s+/g, ' ').trim()
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

/**
 * Scrolls so the plain-text position (collapsed offset into the spoken string) sits near the
 * vertical center of the viewport.
 */
export function scrollReadAlongPlainOffsetIntoViewCenter(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (typeof window === 'undefined') return
  const win = scope.ownerDocument?.defaultView
  if (!win) return

  const walkerOff = walkerOffsetForReadAlongPlainOffset(scope, plainCollapsedLen, plainOffset)
  let pos = locateListenVisibleTextOffset(scope, walkerOff)
  if (!pos) return
  pos = preferLaterEquivalentListenTextBoundary(scope, pos)

  const doc = scope.ownerDocument
  const r = doc.createRange()
  try {
    r.setStart(pos.node, pos.offset)
    r.collapse(true)
  } catch {
    return
  }

  const rect = r.getBoundingClientRect()
  if (rect.height === 0 && rect.width === 0) return

  const vpH = win.innerHeight
  const lineCenter = rect.top + rect.height / 2
  const delta = lineCenter - vpH / 2
  win.scrollBy({ top: delta, behavior })
}
