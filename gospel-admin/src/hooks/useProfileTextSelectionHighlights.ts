'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import {
  closestElement,
  isInsideHighlightIgnoredMount,
  textOffsetWithinScope,
} from '@/lib/profileContentDomHelpers'
import { plainTextForProfileHighlightUi } from '@/lib/profileHighlightVisibleText'
import { addHighlight } from '@/lib/profileHighlightsStorage'

export type UseProfileTextSelectionHighlightsOptions = {
  isHydrated: boolean
  profileSlug: string
  profileTitle: string
  bumpHighlights: () => void
  onHighlightCreated: (highlightId: string) => void
}

/** Listens for text selection in profile body scopes and saves highlights. */
export function useProfileTextSelectionHighlights({
  isHydrated,
  profileSlug,
  profileTitle,
  bumpHighlights,
  onHighlightCreated,
}: UseProfileTextSelectionHighlightsOptions) {
  const onHighlightCreatedRef = useRef(onHighlightCreated)

  useLayoutEffect(() => {
    onHighlightCreatedRef.current = onHighlightCreated
  }, [onHighlightCreated])

  useEffect(() => {
    if (!isHydrated || !profileSlug) return

    const handleSelectionEnd = () => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return

      const range = sel.getRangeAt(0)
      if (!range || range.collapsed) return
      if (
        isInsideHighlightIgnoredMount(range.startContainer) ||
        isInsideHighlightIgnoredMount(range.endContainer)
      ) {
        return
      }

      const startScope = closestElement(range.startContainer, '[data-highlight-scope]')
      const endScope = closestElement(range.endContainer, '[data-highlight-scope]')
      if (!startScope || !endScope || startScope !== endScope) return

      const scopeId = startScope.getAttribute('data-highlight-scope')?.trim()
      const anchorId = startScope.getAttribute('data-highlight-anchor-id')?.trim()
      if (!scopeId || !anchorId) return

      const quote = plainTextForProfileHighlightUi(sel.toString() ?? '')
      if (!quote) return

      let startOffset = 0
      let endOffset = 0
      try {
        startOffset = textOffsetWithinScope(startScope, range.startContainer, range.startOffset)
        endOffset = textOffsetWithinScope(startScope, range.endContainer, range.endOffset)
      } catch {
        return
      }
      if (endOffset <= startOffset) return

      const locationLabel = plainTextForProfileHighlightUi(
        startScope.getAttribute('data-highlight-location-label')?.trim() || 'Highlighted text'
      )

      const added = addHighlight({
        slug: profileSlug,
        resourceTitle: profileTitle,
        anchorId,
        locationLabel,
        scopeId,
        quote,
        startOffset,
        endOffset,
      })
      if (!added) return

      bumpHighlights()
      onHighlightCreatedRef.current(added.id)
      sel.removeAllRanges()
    }

    document.addEventListener('mouseup', handleSelectionEnd)
    document.addEventListener('touchend', handleSelectionEnd)
    return () => {
      document.removeEventListener('mouseup', handleSelectionEnd)
      document.removeEventListener('touchend', handleSelectionEnd)
    }
  }, [isHydrated, profileSlug, profileTitle, bumpHighlights])
}
