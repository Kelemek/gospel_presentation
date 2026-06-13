/**
 * Shared reading-resume restore with fingerprint retry (tab switch, cold mount, app resume).
 */

import {
  isReadingPositionFingerprintValid,
  listenTextOptionsForProfileSlug,
  resolveReadingScope,
} from '@/lib/profileReadingPosition'
import type { ProfileReadingResumeV1 } from '@/lib/profileReadingResumeStorage'

export const READING_RESUME_FINGERPRINT_RETRY_MAX_FRAMES = 30

/**
 * Resume used by scroll-top save guard: storage first, then in-memory fallback only for the same slug.
 */
export function readingResumeForScrollTopGuard(
  profileSlug: string,
  fromStorage: ProfileReadingResumeV1 | null,
  lastSavedForSlug: string | null,
  lastSavedResume: ProfileReadingResumeV1 | null
): ProfileReadingResumeV1 | null {
  if (fromStorage) return fromStorage
  if (lastSavedForSlug === profileSlug) return lastSavedResume
  return null
}

export type ReadingResumeFingerprintState =
  | { status: 'valid' }
  | { status: 'invalid' }
  | { status: 'pending' }
  | { status: 'dom_missing' }

export function evaluateReadingResumeFingerprint(
  resume: ProfileReadingResumeV1,
  profileSlug: string,
  frame: number,
  maxFrames: number = READING_RESUME_FINGERPRINT_RETRY_MAX_FRAMES
): ReadingResumeFingerprintState {
  const scope = resolveReadingScope(resume.anchorId)
  if (!scope) {
    return frame < maxFrames ? { status: 'pending' } : { status: 'dom_missing' }
  }

  const listenOpts = listenTextOptionsForProfileSlug(profileSlug)
  if (isReadingPositionFingerprintValid(scope, resume.fingerprint, listenOpts)) {
    return { status: 'valid' }
  }

  return frame < maxFrames ? { status: 'pending' } : { status: 'invalid' }
}

export type RunReadingResumeRestoreWithRetryOptions = {
  maxFrames?: number
  onSettled?: () => void
  onInvalidFingerprint?: () => void
  /** When true (default), invalid fingerprint after retries skips `onRestore`. Tab switches pass false. */
  skipRestoreOnInvalidFingerprint?: boolean
  onRestore: (resume: ProfileReadingResumeV1, onSettled?: () => void) => void
}

/** Retry fingerprint validation via rAF, then invoke `onRestore` or `onInvalidFingerprint`. */
export function runReadingResumeRestoreWithFingerprintRetry(
  resume: ProfileReadingResumeV1,
  profileSlug: string,
  options: RunReadingResumeRestoreWithRetryOptions
): () => void {
  let cancelled = false
  const maxFrames = options.maxFrames ?? READING_RESUME_FINGERPRINT_RETRY_MAX_FRAMES
  const skipOnInvalid = options.skipRestoreOnInvalidFingerprint !== false

  const run = (frame: number) => {
    if (cancelled) return

    const state = evaluateReadingResumeFingerprint(resume, profileSlug, frame, maxFrames)
    if (state.status === 'pending') {
      requestAnimationFrame(() => run(frame + 1))
      return
    }

    if (state.status === 'valid') {
      options.onRestore(resume, options.onSettled)
      return
    }

    // `invalid` (fingerprint mismatch) or `dom_missing` (anchor never appeared)
    options.onInvalidFingerprint?.()
    if (skipOnInvalid) {
      options.onSettled?.()
      return
    }

    options.onRestore(resume, options.onSettled)
  }

  requestAnimationFrame(() => run(0))

  return () => {
    cancelled = true
  }
}
