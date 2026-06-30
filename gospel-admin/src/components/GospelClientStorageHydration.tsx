'use client'

import { useEffect } from 'react'
import { hydrateGospelClientStorage } from '@/lib/gospelClientStorage'

/** Runs once on app load: migrates large localStorage keys into IndexedDB. */
export function GospelClientStorageHydration() {
  useEffect(() => {
    void hydrateGospelClientStorage()
  }, [])
  return null
}
