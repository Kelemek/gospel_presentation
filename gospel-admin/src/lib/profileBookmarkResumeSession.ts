/** One-shot in-section offset when opening a bookmark on another profile slug. */

const BOOKMARK_RESUME_STORAGE_KEY = 'gospel-profile-bookmark-resume:v1'

export type ProfileBookmarkResumePayloadV1 = {
  v: 1
  anchorId: string
  plainOffset: number
  fingerprint: string
}

export function setPendingBookmarkResume(payload: Omit<ProfileBookmarkResumePayloadV1, 'v'>): void {
  if (typeof window === 'undefined') return
  try {
    const body: ProfileBookmarkResumePayloadV1 = { v: 1, ...payload }
    sessionStorage.setItem(BOOKMARK_RESUME_STORAGE_KEY, JSON.stringify(body))
  } catch {
    /* quota / private mode */
  }
}

export function consumePendingBookmarkResume(): ProfileBookmarkResumePayloadV1 | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(BOOKMARK_RESUME_STORAGE_KEY)
    sessionStorage.removeItem(BOOKMARK_RESUME_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ProfileBookmarkResumePayloadV1>
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
