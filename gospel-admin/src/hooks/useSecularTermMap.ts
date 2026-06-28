'use client'

import { useEffect, useState } from 'react'
import {
  parseSecularTermMapFile,
  EMPTY_SECULAR_TERM_MAP,
  type SecularTermMapFile,
} from '@/lib/biblicalCounseling/secularTermMap'

let cachedMap: SecularTermMapFile | null = null
let fetchPromise: Promise<SecularTermMapFile> | null = null

async function fetchSecularTermMapFromApi(): Promise<SecularTermMapFile> {
  if (cachedMap) return cachedMap
  if (!fetchPromise) {
    fetchPromise = fetch('/api/biblical-counseling/secular-term-map')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load secular term map')
        return res.json()
      })
      .then((raw) => {
        cachedMap = parseSecularTermMapFile(raw)
        return cachedMap
      })
      .catch(() => EMPTY_SECULAR_TERM_MAP)
      .finally(() => {
        fetchPromise = null
      })
  }
  return fetchPromise
}

/** Fetch runtime secular term map once; fall back to bundled JSON on error. */
export function useSecularTermMap(enabled: boolean): SecularTermMapFile {
  const [map, setMap] = useState<SecularTermMapFile>(() => EMPTY_SECULAR_TERM_MAP)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void fetchSecularTermMapFromApi().then((next) => {
      if (!cancelled) setMap(next)
    })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return map
}

/** @internal test helper */
export function resetSecularTermMapCacheForTests(): void {
  cachedMap = null
  fetchPromise = null
}
