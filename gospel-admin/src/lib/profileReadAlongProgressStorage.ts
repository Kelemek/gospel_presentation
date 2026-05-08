/** Resume read-aloud position per profile slug + TOC anchor (`section-*`). Device-only. */

export const PROFILE_READ_ALONG_PROGRESS_KEY_PREFIX = 'gospel-profile-read-along:'

/** Most recent read-aloud anchor for a slug (survives scroll-at-top vs subsection mismatch). */
export const PROFILE_READ_ALONG_LAST_SESSION_KEY_PREFIX = 'gospel-profile-read-along-last:'

export type ProfileReadAlongProgressV1 = {
  v: 1
  plainOffset: number
  fingerprint: string
}

export function readAlongProgressStorageKey(profileSlug: string, anchorId: string): string {
  return `${PROFILE_READ_ALONG_PROGRESS_KEY_PREFIX}${profileSlug}:${anchorId}`
}

export function readAlongLastSessionStorageKey(profileSlug: string): string {
  return `${PROFILE_READ_ALONG_LAST_SESSION_KEY_PREFIX}${profileSlug}`
}

export type ProfileReadAlongLastSessionV1 = {
  v: 1
  anchorId: string
  plainOffset: number
  fingerprint: string
}

/** Stable fingerprint when section plain text changes (admin/content edits). */
export function readAlongTextFingerprint(text: string): string {
  let h = 5381 >>> 0
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0
  }
  return `${text.length}:${h.toString(36)}`
}

export function saveProfileReadAlongProgress(
  profileSlug: string,
  anchorId: string,
  plainOffset: number,
  fingerprint: string
): void {
  if (typeof window === 'undefined') return
  try {
    const payload: ProfileReadAlongProgressV1 = { v: 1, plainOffset, fingerprint }
    localStorage.setItem(readAlongProgressStorageKey(profileSlug, anchorId), JSON.stringify(payload))
  } catch {
    // quota / private mode
  }
}

export function saveProfileReadAlongLastSession(
  profileSlug: string,
  anchorId: string,
  plainOffset: number,
  fingerprint: string
): void {
  if (typeof window === 'undefined') return
  try {
    const payload: ProfileReadAlongLastSessionV1 = {
      v: 1,
      anchorId,
      plainOffset,
      fingerprint,
    }
    localStorage.setItem(readAlongLastSessionStorageKey(profileSlug), JSON.stringify(payload))
  } catch {
    // quota / private mode
  }
}

export function loadProfileReadAlongLastSession(profileSlug: string): ProfileReadAlongLastSessionV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(readAlongLastSessionStorageKey(profileSlug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ProfileReadAlongLastSessionV1>
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

export function clearProfileReadAlongLastSession(profileSlug: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(readAlongLastSessionStorageKey(profileSlug))
  } catch {
    /* ignore */
  }
}

/** Drop last-session pointer when it referred to this anchor (section finished or progress cleared). */
export function clearProfileReadAlongLastSessionIfAnchorMatches(
  profileSlug: string,
  anchorId: string
): void {
  const last = loadProfileReadAlongLastSession(profileSlug)
  if (last && last.anchorId === anchorId) {
    clearProfileReadAlongLastSession(profileSlug)
  }
}

export function loadProfileReadAlongProgress(
  profileSlug: string,
  anchorId: string
): ProfileReadAlongProgressV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(readAlongProgressStorageKey(profileSlug, anchorId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ProfileReadAlongProgressV1>
    if (parsed?.v !== 1 || typeof parsed.plainOffset !== 'number' || typeof parsed.fingerprint !== 'string') {
      return null
    }
    return { v: 1, plainOffset: parsed.plainOffset, fingerprint: parsed.fingerprint }
  } catch {
    return null
  }
}

export function clearProfileReadAlongProgress(profileSlug: string, anchorId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(readAlongProgressStorageKey(profileSlug, anchorId))
  } catch {
    // ignore
  }
  clearProfileReadAlongLastSessionIfAnchorMatches(profileSlug, anchorId)
}
