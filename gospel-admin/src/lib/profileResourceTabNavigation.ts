import type { ProfileReadingResumeV1 } from '@/lib/profileReadingResumeStorage'

/** Set before `router.push` from the profile resource tab bar; consumed on the target profile page. */
export const PROFILE_RESOURCE_TAB_NAV_SESSION_KEY = 'gospel-profile-resource-tab-nav:v1'

const PROFILE_RESOURCE_TAB_NAV_RESUME_SESSION_KEY =
  'gospel-profile-resource-tab-nav-resume:v1'

type MemoryStagedTabNav = {
  slug: string
  resume: ProfileReadingResumeV1 | null
}

/** Survives React Strict Mode remount (session consume-once was clearing before second mount). */
let memoryStagedTabNav: MemoryStagedTabNav | null = null

function parseResume(raw: string | null): ProfileReadingResumeV1 | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileReadingResumeV1>
    if (
      parsed?.v !== 1 ||
      typeof parsed.anchorId !== 'string' ||
      typeof parsed.plainOffset !== 'number' ||
      typeof parsed.fingerprint !== 'string'
    ) {
      return null
    }
    return {
      v: 1,
      anchorId: parsed.anchorId,
      plainOffset: parsed.plainOffset,
      fingerprint: parsed.fingerprint,
    }
  } catch {
    return null
  }
}

function clearSessionTabNavStaging(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(PROFILE_RESOURCE_TAB_NAV_SESSION_KEY)
    sessionStorage.removeItem(PROFILE_RESOURCE_TAB_NAV_RESUME_SESSION_KEY)
  } catch {
    /* private mode */
  }
}

/** @internal Tests only */
export function resetProfileResourceTabNavigationForTests(): void {
  memoryStagedTabNav = null
  clearSessionTabNavStaging()
}

export function isProfileResourceTabNavigationPending(targetSlug: string): boolean {
  const slug = targetSlug.trim()
  if (!slug) return false
  if (memoryStagedTabNav?.slug === slug) return true
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(PROFILE_RESOURCE_TAB_NAV_SESSION_KEY) === slug
  } catch {
    return false
  }
}

/** Stage in-tab navigation so the destination profile can restore scroll before paint. */
export function markProfileResourceTabNavigation(
  targetSlug: string,
  resume: ProfileReadingResumeV1 | null
): void {
  if (typeof window === 'undefined') return
  const slug = targetSlug.trim()
  if (!slug) return
  memoryStagedTabNav = { slug, resume }
  try {
    sessionStorage.setItem(PROFILE_RESOURCE_TAB_NAV_SESSION_KEY, slug)
    if (resume) {
      sessionStorage.setItem(
        PROFILE_RESOURCE_TAB_NAV_RESUME_SESSION_KEY,
        JSON.stringify(resume)
      )
    } else {
      sessionStorage.removeItem(PROFILE_RESOURCE_TAB_NAV_RESUME_SESSION_KEY)
    }
  } catch {
    /* private mode */
  }
}

/**
 * Read staged resume without clearing (safe across layout effect re-runs / Strict Mode remount).
 */
export function peekProfileResourceTabNavigation(
  expectedSlug: string
): ProfileReadingResumeV1 | null | undefined {
  const slug = expectedSlug.trim()
  if (!slug) return undefined
  if (memoryStagedTabNav?.slug === slug) {
    return memoryStagedTabNav.resume
  }
  if (typeof window === 'undefined') return undefined
  try {
    const pendingSlug = sessionStorage.getItem(PROFILE_RESOURCE_TAB_NAV_SESSION_KEY)
    if (pendingSlug !== slug) return undefined
    return parseResume(sessionStorage.getItem(PROFILE_RESOURCE_TAB_NAV_RESUME_SESSION_KEY))
  } catch {
    return undefined
  }
}

/**
 * Clear staged tab navigation. When `forSlug` is set, only clears if memory/session
 * match that slug so a late restore settle on profile A cannot wipe staging for B.
 */
export function clearProfileResourceTabNavigationStaging(forSlug?: string): void {
  if (forSlug !== undefined) {
    const slug = forSlug.trim()
    if (!slug) return
    if (memoryStagedTabNav && memoryStagedTabNav.slug !== slug) {
      return
    }
    if (typeof window !== 'undefined') {
      try {
        const sessionSlug = sessionStorage.getItem(PROFILE_RESOURCE_TAB_NAV_SESSION_KEY)
        if (sessionSlug !== null && sessionSlug !== slug) {
          return
        }
      } catch {
        return
      }
    }
  }
  memoryStagedTabNav = null
  clearSessionTabNavStaging()
}

/** @deprecated Prefer peek + clearProfileResourceTabNavigationStaging for tab restore. */
export function consumeProfileResourceTabNavigation(
  expectedSlug: string
): ProfileReadingResumeV1 | null | undefined {
  const peeked = peekProfileResourceTabNavigation(expectedSlug)
  if (peeked === undefined) return undefined
  clearProfileResourceTabNavigationStaging(expectedSlug)
  return peeked
}
