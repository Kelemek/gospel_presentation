'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GospelProfile } from './types'
import { getProfileOfflineCache, setProfileOfflineCache } from '@/lib/profileOfflineCache'
import { profileOfflineCacheKey } from '@/lib/gospelClientStoragePolicy'

function parseCachedProfile(value: string | null): { profile: GospelProfile; updatedAt: string } | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed?.profile?.slug) return null
    const p = parsed.profile
    // Restore Date fields
    const profile: GospelProfile = {
      ...p,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      lastViewedScripture: p.lastViewedScripture
        ? {
            ...p.lastViewedScripture,
            viewedAt: p.lastViewedScripture.viewedAt ? new Date(p.lastViewedScripture.viewedAt) : new Date()
          }
        : undefined,
      savedAnswers: (p.savedAnswers || []).map((a: any) => ({
        ...a,
        answeredAt: a.answeredAt ? new Date(a.answeredAt) : new Date()
      }))
    }
    return { profile, updatedAt: parsed.updatedAt || p.updatedAt || profile.updatedAt.toISOString() }
  } catch {
    return null
  }
}

function serializeForCache(profile: GospelProfile): string {
  const updatedAt = profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : String(profile.updatedAt)
  return JSON.stringify({
    profile: {
      ...profile,
      createdAt: profile.createdAt instanceof Date ? profile.createdAt.toISOString() : profile.createdAt,
      updatedAt: profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : profile.updatedAt,
      lastViewedScripture: profile.lastViewedScripture
        ? {
            ...profile.lastViewedScripture,
            viewedAt:
              profile.lastViewedScripture.viewedAt instanceof Date
                ? profile.lastViewedScripture.viewedAt.toISOString()
                : profile.lastViewedScripture.viewedAt
          }
        : undefined
    },
    updatedAt
  })
}

export interface UseProfileWithCacheResult {
  profile: GospelProfile | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * Cache-first profile loading. Uses IndexedDB offline cache first; only fetches from API when
 * no cache or when admin has updated the profile (checked via /api/profiles/[slug]/modified).
 */
export function useProfileWithCache(slug: string): UseProfileWithCacheResult {
  const [profile, setProfile] = useState<GospelProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAndCache = useCallback(async () => {
    if (!slug) {
      setIsLoading(false)
      return
    }
    try {
      const res = await fetch(`/api/profiles/${slug}`)
      if (!res.ok) {
        if (res.status === 404) {
          setProfile(null)
          setError(null)
        } else {
          setError('Failed to load profile')
        }
        return
      }
      const data = await res.json()
      const p = data.profile
      if (!p) {
        setProfile(null)
        return
      }
      const profileObj: GospelProfile = {
        ...p,
        id: p.id ?? '',
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        lastViewedScripture: p.lastViewedScripture
          ? {
              ...p.lastViewedScripture,
              viewedAt: p.lastViewedScripture.viewedAt ? new Date(p.lastViewedScripture.viewedAt) : new Date()
            }
          : undefined,
        savedAnswers: (p.savedAnswers || []).map((a: any) => ({
          ...a,
          answeredAt: a.answeredAt ? new Date(a.answeredAt) : new Date()
        }))
      }
      if (typeof window !== 'undefined') {
        try {
          await setProfileOfflineCache(slug, serializeForCache(profileObj))
        } catch {
          // ignore quota errors
        }
      }
      setProfile(profileObj)
      setError(null)
    } catch {
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }, [slug])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    await fetchAndCache()
  }, [fetchAndCache])

  useEffect(() => {
    if (!slug) {
      setIsLoading(false)
      return
    }
    let cancelled = false

    const run = async () => {
      const cachedRaw =
        typeof window !== 'undefined'
          ? getProfileOfflineCache(slug) ??
            (typeof localStorage !== 'undefined'
              ? localStorage.getItem(profileOfflineCacheKey(slug))
              : null)
          : null
      const cached = parseCachedProfile(cachedRaw)

      if (cached) {
        setProfile(cached.profile)
        setIsLoading(false)
        setError(null)
        // Validate in background - if admin updated, refetch
        try {
          const modRes = await fetch(`/api/profiles/${slug}/modified`)
          if (cancelled) return
          if (modRes.ok) {
            const modData = await modRes.json()
            const serverUpdatedAt = modData.updatedAt
            if (serverUpdatedAt && serverUpdatedAt !== cached.updatedAt) {
              await fetchAndCache()
            }
          }
        } catch {
          // keep cached on error
        }
        return
      }

      await fetchAndCache()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [slug, fetchAndCache])

  return { profile, isLoading, error, refresh }
}
