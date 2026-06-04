'use client'

import { useState, useEffect, useCallback } from 'react'
import type { GospelProfile } from './types'
import { hydrateGospelClientStorage, gospelStorageGet } from '@/lib/gospelClientStorage'
import { getProfileOfflineCache, setProfileOfflineCache } from '@/lib/profileOfflineCache'
import { profileOfflineCacheKey } from '@/lib/gospelClientStoragePolicy'
import {
  isLikelyVisitOnlyTimestampBump,
  profileUpdatedAtMatches,
} from '@/lib/profileUpdatedAtCompare'

/** Parsed profiles already loaded this browser session (instant resource-tab return). */
const profileSessionCache = new Map<string, { profile: GospelProfile; updatedAt: string }>()

/** Skip repeat /modified checks after a fresh validation (resource tab switches). */
const lastValidationBySlug = new Map<string, { envelopeUpdatedAt: string; validatedAt: number }>()
const PROFILE_VALIDATION_TTL_MS = 120_000

const fetchInFlightBySlug = new Map<string, Promise<void>>()

/** @internal Tests only */
export function clearProfileSessionCacheForTests(): void {
  profileSessionCache.clear()
  lastValidationBySlug.clear()
  fetchInFlightBySlug.clear()
}

function recordProfileValidation(slug: string, envelopeUpdatedAt: string): void {
  const key = slug.trim()
  if (!key) return
  lastValidationBySlug.set(key, { envelopeUpdatedAt, validatedAt: Date.now() })
}

function shouldSkipModifiedCheck(slug: string, envelopeUpdatedAt: string): boolean {
  const key = slug.trim()
  if (!key) return false
  const entry = lastValidationBySlug.get(key)
  if (!entry || entry.envelopeUpdatedAt !== envelopeUpdatedAt) return false
  return Date.now() - entry.validatedAt < PROFILE_VALIDATION_TTL_MS
}

function syncEnvelopeUpdatedAt(slug: string, serverUpdatedAt: string): void {
  const sessionEntry = readProfileFromSession(slug)
  if (sessionEntry) {
    rememberProfileInSession(slug, sessionEntry.profile, serverUpdatedAt)
  }
  recordProfileValidation(slug, serverUpdatedAt)
}

function rememberProfileInSession(slug: string, profile: GospelProfile, updatedAt: string): void {
  const key = slug.trim()
  if (!key) return
  profileSessionCache.set(key, { profile, updatedAt })
}

function readProfileFromSession(slug: string): { profile: GospelProfile; updatedAt: string } | null {
  const key = slug.trim()
  if (!key) return null
  return profileSessionCache.get(key) ?? null
}

function parseCachedProfile(value: string | null): { profile: GospelProfile; updatedAt: string } | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed?.profile?.slug) return null
    const p = parsed.profile
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
    const envelopeUpdatedAt =
      typeof parsed.updatedAt === 'string'
        ? parsed.updatedAt
        : typeof p.updatedAt === 'string'
          ? p.updatedAt
          : profile.updatedAt.toISOString()
    return { profile, updatedAt: envelopeUpdatedAt }
  } catch {
    return null
  }
}

function serializeForCache(profile: GospelProfile, envelopeUpdatedAt?: string): string {
  const updatedAt =
    envelopeUpdatedAt ??
    (profile.updatedAt instanceof Date ? profile.updatedAt.toISOString() : String(profile.updatedAt))
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
  /** True after initial load and any background /modified validation for this slug. */
  profileLoadSettled: boolean
  refresh: () => Promise<void>
}

/**
 * Cache-first profile loading. Uses IndexedDB offline cache first; only fetches from API when
 * no cache or when admin has updated the profile (checked via /api/profiles/[slug]/modified).
 */
export function useProfileWithCache(slug: string): UseProfileWithCacheResult {
  const [profile, setProfile] = useState<GospelProfile | null>(() => {
    if (!slug || typeof window === 'undefined') return null
    return readProfileFromSession(slug)?.profile ?? null
  })
  const [isLoading, setIsLoading] = useState(() => {
    if (!slug) return false
    if (typeof window === 'undefined') return true
    // Always resolve on mount (resource tab remounts) so UI can show a spinner during IndexedDB hydrate/parse.
    return true
  })
  const [error, setError] = useState<string | null>(null)
  const [profileLoadSettled, setProfileLoadSettled] = useState(() => !slug)

  const fetchAndCache = useCallback(async () => {
    if (!slug) {
      setIsLoading(false)
      setProfileLoadSettled(true)
      return
    }
    const slugKey = slug.trim()
    const inFlight = fetchInFlightBySlug.get(slugKey)
    if (inFlight) {
      await inFlight
      return
    }
    const run = async () => {
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
      let envelopeUpdatedAt =
        profileObj.updatedAt instanceof Date
          ? profileObj.updatedAt.toISOString()
          : String(profileObj.updatedAt)
      try {
        const modRes = await fetch(`/api/profiles/${slug}/modified`)
        if (modRes.ok) {
          const modData = await modRes.json()
          if (typeof modData.updatedAt === 'string') {
            envelopeUpdatedAt = modData.updatedAt
          }
        }
      } catch {
        // use profile updatedAt
      }
      if (typeof window !== 'undefined') {
        try {
          await setProfileOfflineCache(slug, serializeForCache(profileObj, envelopeUpdatedAt))
        } catch {
          // ignore quota errors
        }
      }
      rememberProfileInSession(slug, profileObj, envelopeUpdatedAt)
      recordProfileValidation(slug, envelopeUpdatedAt)
      setProfile(profileObj)
      setError(null)
    } catch {
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
      setProfileLoadSettled(true)
    }
    }
    const promise = run()
    fetchInFlightBySlug.set(slugKey, promise)
    try {
      await promise
    } finally {
      if (fetchInFlightBySlug.get(slugKey) === promise) {
        fetchInFlightBySlug.delete(slugKey)
      }
    }
  }, [slug])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setProfileLoadSettled(false)
    await fetchAndCache()
  }, [fetchAndCache])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setProfileLoadSettled(false)
    })

    const applyCachedProfile = (cached: { profile: GospelProfile; updatedAt: string }) => {
      rememberProfileInSession(slug, cached.profile, cached.updatedAt)
      queueMicrotask(() => {
        if (cancelled) return
        setProfile(cached.profile)
        setIsLoading(false)
        setError(null)
      })
    }

    const validateCachedInBackground = async (cachedUpdatedAt: string) => {
      try {
        if (shouldSkipModifiedCheck(slug, cachedUpdatedAt)) {
          return
        }
        const modRes = await fetch(`/api/profiles/${slug}/modified`)
        if (cancelled) return
        if (modRes.ok) {
          const modData = await modRes.json()
          const serverUpdatedAt = modData.updatedAt as string | undefined
          const stale = !profileUpdatedAtMatches(cachedUpdatedAt, serverUpdatedAt)
          const visitBump =
            stale && isLikelyVisitOnlyTimestampBump(cachedUpdatedAt, serverUpdatedAt)
          if (visitBump && serverUpdatedAt) {
            syncEnvelopeUpdatedAt(slug, serverUpdatedAt)
          } else if (stale) {
            void fetchAndCache()
          } else if (serverUpdatedAt) {
            syncEnvelopeUpdatedAt(slug, serverUpdatedAt)
          }
        }
      } catch {
        // keep cached on error
      } finally {
        if (!cancelled) {
          setProfileLoadSettled(true)
        }
      }
    }

    const run = async () => {
      const sessionCached = readProfileFromSession(slug)
      if (sessionCached) {
        applyCachedProfile(sessionCached)
        if (shouldSkipModifiedCheck(slug, sessionCached.updatedAt)) {
          queueMicrotask(() => {
            if (!cancelled) setProfileLoadSettled(true)
          })
        } else {
          void validateCachedInBackground(sessionCached.updatedAt)
        }
        return
      }

      let cachedRaw: string | null = null
      if (typeof window !== 'undefined') {
        await hydrateGospelClientStorage()
        if (cancelled) return
        cachedRaw =
          (await gospelStorageGet(profileOfflineCacheKey(slug))) ??
          getProfileOfflineCache(slug) ??
          (typeof localStorage !== 'undefined'
            ? localStorage.getItem(profileOfflineCacheKey(slug))
            : null)
      }
      const cached = parseCachedProfile(cachedRaw)

      if (cached) {
        applyCachedProfile(cached)
        void validateCachedInBackground(cached.updatedAt)
        return
      }

      await fetchAndCache()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [slug, fetchAndCache])

  return { profile, isLoading, error, profileLoadSettled, refresh }
}
