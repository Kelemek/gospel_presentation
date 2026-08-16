'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VersePinAnchoredEntry, VersePinsStoredState } from '@/lib/versePinStorage'
import {
  clearAllVersePins,
  createEmptyVersePinsState,
  hydrateVersePinsFromStorage,
  loadVersePins,
  removeVersePin,
  versePinsListFromState,
} from '@/lib/versePinStorage'

export function useProfileVersePins(profileSlug: string) {
  const [versePinRevision, setVersePinRevision] = useState(0)

  const bumpVersePins = useCallback(() => {
    setVersePinRevision((v) => v + 1)
  }, [])

  const versePinMap = useMemo((): VersePinsStoredState => {
    void versePinRevision
    if (!profileSlug) return createEmptyVersePinsState()
    return loadVersePins(profileSlug)
  }, [profileSlug, versePinRevision])

  const versePinsList = useMemo(() => versePinsListFromState(versePinMap), [versePinMap])

  useEffect(() => {
    if (!profileSlug) return
    let cancelled = false
    void hydrateVersePinsFromStorage(profileSlug).then(() => {
      if (!cancelled) bumpVersePins()
    })
    return () => {
      cancelled = true
    }
  }, [profileSlug, bumpVersePins])

  const handleRemoveVersePin = useCallback(
    (pin: Pick<VersePinAnchoredEntry, 'bookmarkId' | 'colorId'>) => {
      if (!profileSlug) return
      if (pin.bookmarkId != null && pin.bookmarkId !== '') {
        removeVersePin(profileSlug, { kind: 'bookmark', bookmarkId: pin.bookmarkId })
      } else {
        removeVersePin(profileSlug, { kind: 'yellow' })
      }
      bumpVersePins()
    },
    [profileSlug, bumpVersePins]
  )

  const handleClearAllVersePins = useCallback(() => {
    if (!profileSlug) return
    clearAllVersePins(profileSlug)
    bumpVersePins()
  }, [profileSlug, bumpVersePins])

  return {
    versePinMap,
    versePinsList,
    bumpVersePins,
    handleRemoveVersePin,
    handleClearAllVersePins,
  }
}
