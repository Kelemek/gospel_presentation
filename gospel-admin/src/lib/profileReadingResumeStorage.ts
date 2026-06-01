/** Automatic per-profile reading position (scroll), device-only. */

import {
  gospelStorageGetSync,
  gospelStorageRemoveSync,
  gospelStorageSetSync,
} from '@/lib/gospelClientStorage'

export const PROFILE_READING_RESUME_KEY_PREFIX = 'gospel-profile-reading-resume:'

export type ProfileReadingResumeV1 = {
  v: 1
  anchorId: string
  plainOffset: number
  fingerprint: string
}

export function profileReadingResumeStorageKey(profileSlug: string): string {
  return `${PROFILE_READING_RESUME_KEY_PREFIX}${profileSlug}`
}

export function saveProfileReadingResume(
  profileSlug: string,
  anchorId: string,
  plainOffset: number,
  fingerprint: string
): void {
  if (typeof window === 'undefined') return
  try {
    const payload: ProfileReadingResumeV1 = {
      v: 1,
      anchorId,
      plainOffset,
      fingerprint,
    }
    gospelStorageSetSync(profileReadingResumeStorageKey(profileSlug), JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

export function loadProfileReadingResume(profileSlug: string): ProfileReadingResumeV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = gospelStorageGetSync(profileReadingResumeStorageKey(profileSlug))
    if (!raw) return null
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

export function clearProfileReadingResume(profileSlug: string): void {
  if (typeof window === 'undefined') return
  try {
    gospelStorageRemoveSync(profileReadingResumeStorageKey(profileSlug))
  } catch {
    /* ignore */
  }
}
