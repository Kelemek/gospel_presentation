import {
  listenCollapsedPlainFromRaw,
  listenNeedsImplicitBreak,
} from '@/lib/profileResourceListenText'

export type ScriptureListenTextOptions = {
  /** When true, text inside `<sup>` (verse numbers) is excluded from the listen plain stream. */
  omitVerseSup?: boolean
}

function isWithinVerseSup(node: Node, root: HTMLElement): boolean {
  let cur: Node | null = node
  while (cur && cur !== root) {
    if (cur instanceof Element && cur.tagName === 'SUP') return true
    cur = cur.parentNode
  }
  return false
}

function scriptureListenTextNodeIneligible(
  node: Text,
  root: HTMLElement,
  opts?: ScriptureListenTextOptions
): boolean {
  if (opts?.omitVerseSup && isWithinVerseSup(node, root)) return true
  return false
}

/** Raw listen stream for scripture passage HTML (skips verse `<sup>` when configured). */
export function visibleScriptureListenRawText(
  root: HTMLElement,
  opts?: ScriptureListenTextOptions
): string {
  const doc = root.ownerDocument
  if (!doc) return ''
  let s = ''
  let prevEligible: Text | null = null
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (!(node instanceof Text)) {
      node = walker.nextNode()
      continue
    }
    if (scriptureListenTextNodeIneligible(node, root, opts)) {
      node = walker.nextNode()
      continue
    }
    if (prevEligible && listenNeedsImplicitBreak(prevEligible, node, root)) {
      s += '\n'
    }
    s += node.textContent ?? ''
    prevEligible = node
    node = walker.nextNode()
  }
  return s
}

export function plainTextForScriptureListen(
  root: HTMLElement,
  opts?: ScriptureListenTextOptions
): string {
  return listenCollapsedPlainFromRaw(visibleScriptureListenRawText(root, opts))
}

/** Maps a code-unit index into {@link visibleScriptureListenRawText} to a `(Text, offset)` boundary. */
export function locateScriptureListenRawTextOffset(
  root: HTMLElement,
  rawTarget: number,
  opts?: ScriptureListenTextOptions
): { node: Text; offset: number } | null {
  if (rawTarget < 0) return null

  let position = 0
  let prevEligible: Text | null = null
  let lastEligible: Text | null = null
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node: Node | null = walker.nextNode()
  while (node) {
    if (!(node instanceof Text)) {
      node = walker.nextNode()
      continue
    }
    if (scriptureListenTextNodeIneligible(node, root, opts)) {
      node = walker.nextNode()
      continue
    }

    if (prevEligible && listenNeedsImplicitBreak(prevEligible, node, root)) {
      if (rawTarget === position) {
        return { node, offset: 0 }
      }
      position += 1
    }

    const text = node.textContent ?? ''
    const len = text.length
    lastEligible = node

    if (len > 0 && rawTarget < position + len) {
      return { node, offset: rawTarget - position }
    }
    position += len
    prevEligible = node
    node = walker.nextNode()
  }

  if (lastEligible && rawTarget === position) {
    return { node: lastEligible, offset: lastEligible.length }
  }
  return null
}

export const SCRIPTURE_LISTEN_TEXT_OPTIONS: ScriptureListenTextOptions = { omitVerseSup: true }

export function walkerOffsetForScriptureReadAlongPlainOffset(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  opts: ScriptureListenTextOptions = SCRIPTURE_LISTEN_TEXT_OPTIONS
): number {
  const raw = visibleScriptureListenRawText(scope, opts)
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

export function locateScriptureListenRawTextOffsetFromPlain(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  opts: ScriptureListenTextOptions = SCRIPTURE_LISTEN_TEXT_OPTIONS
): { node: Text; offset: number } | null {
  const wOff = walkerOffsetForScriptureReadAlongPlainOffset(scope, plainCollapsedLen, plainOffset, opts)
  return locateScriptureListenRawTextOffset(scope, wOff, opts)
}

export function getScriptureListenCaretClientRect(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffset: number,
  listenTextOptions: ScriptureListenTextOptions = SCRIPTURE_LISTEN_TEXT_OPTIONS
): DOMRect | null {
  const rawPos = locateScriptureListenRawTextOffsetFromPlain(
    scope,
    plainCollapsedLen,
    plainOffset,
    listenTextOptions
  )
  if (!rawPos) return null
  const doc = scope.ownerDocument
  const r = doc.createRange()
  try {
    r.setStart(rawPos.node, rawPos.offset)
    r.collapse(true)
  } catch {
    return null
  }
  let rect: DOMRect
  try {
    rect = r.getBoundingClientRect()
  } catch {
    return null
  }
  if (rect.height === 0 && rect.width === 0) return null
  return rect
}

/** Caret viewport rect interpolated between adjacent plain offsets (smooth read-along scroll). */
export function getScriptureListenInterpolatedCaretClientRect(
  scope: HTMLElement,
  plainCollapsedLen: number,
  plainOffsetFloat: number,
  listenTextOptions: ScriptureListenTextOptions = SCRIPTURE_LISTEN_TEXT_OPTIONS
): Pick<DOMRectReadOnly, 'top' | 'bottom'> | null {
  if (plainCollapsedLen <= 0) return null

  const maxOffset = Math.max(0, plainCollapsedLen - 1)
  const clamped = Math.min(maxOffset, Math.max(0, plainOffsetFloat))
  const offset0 = Math.floor(clamped)
  const offset1 = Math.min(maxOffset, offset0 + 1)
  const t = offset1 === offset0 ? 0 : clamped - offset0

  const rect0 = getScriptureListenCaretClientRect(
    scope,
    plainCollapsedLen,
    offset0,
    listenTextOptions
  )
  if (!rect0) return null
  if (t === 0) return rect0

  const rect1 = getScriptureListenCaretClientRect(
    scope,
    plainCollapsedLen,
    offset1,
    listenTextOptions
  )
  if (!rect1) return rect0

  return {
    top: rect0.top + (rect1.top - rect0.top) * t,
    bottom: rect0.bottom + (rect1.bottom - rect0.bottom) * t,
  }
}
