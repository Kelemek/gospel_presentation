'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProfileTextSelectionHighlights } from '@/hooks/useProfileTextSelectionHighlights'
import {
  highlightsForSlug,
  removeHighlight,
  type ProfileHighlight,
} from '@/lib/profileHighlightsStorage'

export type UseProfileHighlightUiOptions = {
  isHydrated: boolean
  profileSlug: string
  profileTitle: string
  showConfirm: (message: string) => Promise<boolean>
}

export function useProfileHighlightUi({
  isHydrated,
  profileSlug,
  profileTitle,
  showConfirm,
}: UseProfileHighlightUiOptions) {
  const [highlightRevision, setHighlightRevision] = useState(0)
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null)
  const activeHighlightTimerRef = useRef<number | null>(null)

  const bumpHighlights = useCallback(() => {
    setHighlightRevision((v) => v + 1)
  }, [])

  const profileHighlights = useMemo((): ProfileHighlight[] => {
    void highlightRevision
    if (!profileSlug) return []
    return highlightsForSlug(profileSlug)
  }, [profileSlug, highlightRevision])

  const highlightsByScopeId = useMemo(() => {
    const out: Record<string, Array<{ id: string; startOffset: number; endOffset: number }>> = {}
    profileHighlights.forEach((h) => {
      if (!out[h.scopeId]) out[h.scopeId] = []
      out[h.scopeId]!.push({ id: h.id, startOffset: h.startOffset, endOffset: h.endOffset })
    })
    return out
  }, [profileHighlights])

  const flashActiveHighlight = useCallback((highlightId: string, durationMs: number) => {
    setActiveHighlightId(highlightId)
    if (activeHighlightTimerRef.current != null) window.clearTimeout(activeHighlightTimerRef.current)
    activeHighlightTimerRef.current = window.setTimeout(() => setActiveHighlightId(null), durationMs)
  }, [])

  const handleHighlightCreated = useCallback(
    (highlightId: string) => {
      flashActiveHighlight(highlightId, 1800)
    },
    [flashActiveHighlight]
  )

  useProfileTextSelectionHighlights({
    isHydrated,
    profileSlug,
    profileTitle,
    bumpHighlights,
    onHighlightCreated: handleHighlightCreated,
  })

  useEffect(() => {
    return () => {
      if (activeHighlightTimerRef.current != null) {
        window.clearTimeout(activeHighlightTimerRef.current)
      }
    }
  }, [])

  const focusHighlightById = useCallback(
    (highlightId: string) => {
      flashActiveHighlight(highlightId, 2400)
    },
    [flashActiveHighlight]
  )

  const requestRemoveHighlightFromBody = useCallback(
    async (highlightId: string) => {
      const ok = await showConfirm('Remove this highlight?')
      if (!ok) return
      removeHighlight(highlightId)
      bumpHighlights()
      setActiveHighlightId((cur) => (cur === highlightId ? null : cur))
    },
    [showConfirm, bumpHighlights]
  )

  return {
    highlightRevision,
    bumpHighlights,
    highlightsByScopeId,
    activeHighlightId,
    focusHighlightById,
    requestRemoveHighlightFromBody,
  }
}
