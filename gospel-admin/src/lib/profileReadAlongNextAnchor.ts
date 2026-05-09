import { buildOrderedTocAnchorIds } from '@/lib/tocAnchorFromScroll'
import type { ProfileListenTextOptions } from '@/lib/profileHighlightVisibleText'
import { plainTextForProfileResourceListen } from '@/lib/profileResourceListenText'
import type { GospelSection } from '@/lib/types'

/**
 * Next profile read-aloud scope after `afterAnchorId` in TOC order.
 * Skips anchors whose DOM nodes lie inside `completedScope` (except the completed node itself)
 * so finishing a whole top-level `section-N` block does not re-read nested `section-N-M` entries.
 */
export function findNextReadAlongScope(
  sections: GospelSection[],
  completedScope: HTMLElement | null,
  afterAnchorId: string | null,
  listenTextOptions?: ProfileListenTextOptions
): { anchorId: string; scope: HTMLElement; text: string } | null {
  if (typeof document === 'undefined') return null
  const ids = buildOrderedTocAnchorIds(sections)
  let start = 0
  if (afterAnchorId) {
    const idx = ids.indexOf(afterAnchorId)
    start = idx >= 0 ? idx + 1 : 0
  }
  for (let i = start; i < ids.length; i++) {
    const anchorId = ids[i]!
    const el = document.getElementById(anchorId)
    if (!(el instanceof HTMLElement)) continue
    if (completedScope && el !== completedScope && completedScope.contains(el)) {
      continue
    }
    const text = plainTextForProfileResourceListen(el, listenTextOptions)
    if (text) return { anchorId, scope: el, text }
  }
  return null
}
