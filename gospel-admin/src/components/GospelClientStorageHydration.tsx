'use client'

import { useEffect } from 'react'
import { hydrateMemorizedVersesStorage } from '@/lib/verseMemorizationStorage'

/** Runs once on app load: migrates large localStorage keys into IndexedDB. */
export function GospelClientStorageHydration() {
  useEffect(() => {
    void hydrateMemorizedVersesStorage()
  }, [])
  return null
}
