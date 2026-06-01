import { hydrateGospelClientStorage } from '@/lib/gospelClientStorage'
import {
  isProfileAppLaunchEntryPath,
  loadProfileLastActiveSlug,
  PROFILE_APP_LAUNCH_RESUME_SESSION_KEY,
  shouldSkipProfileAppLaunchResume,
} from '@/lib/profileLastOpenResourceStorage'

export type ApplyProfileAppLaunchResumeOptions = {
  /** When false (e.g. effect cleanup), abort without routing. */
  getPathname?: () => string | null
}

function readPathname(getPathname: () => string | null): string | null {
  const raw = getPathname()?.trim()
  return raw ? raw : null
}

function isProfileAppLaunchResumeDone(): boolean {
  try {
    return sessionStorage.getItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY) === '1'
  } catch {
    // private mode / disabled storage
    return false
  }
}

function markProfileAppLaunchResumeDone(): void {
  try {
    sessionStorage.setItem(PROFILE_APP_LAUNCH_RESUME_SESSION_KEY, '1')
  } catch {
    // ignore
  }
}

/** True when navigation changed away from the launch context we are handling. */
function shouldAbortLaunchResume(
  getPathname: () => string | null,
  context: 'root' | 'entry'
): boolean {
  const current = readPathname(getPathname)
  if (!current) return true
  if (shouldSkipProfileAppLaunchResume(current)) return true
  const normalized = current.replace(/\/$/, '') || '/'
  if (context === 'root' && normalized !== '/') return true
  if (context === 'entry' && !isProfileAppLaunchEntryPath(current)) return true
  return false
}

/**
 * On cold start at `/` or `/default`, open the last profile the reader was on (no hash).
 * Waits for client storage hydration so recent-history reads are reliable.
 * Uses a per-session flag so a later intentional visit to `/` or `/default` is not overridden.
 */
export async function applyProfileAppLaunchResume(
  replace: (path: string) => void,
  options: ApplyProfileAppLaunchResumeOptions = {}
): Promise<void> {
  const getPathname = options.getPathname ?? (() =>
    typeof window !== 'undefined' ? window.location.pathname : null)

  await hydrateGospelClientStorage()
  if (typeof window === 'undefined') return

  const pathname = readPathname(getPathname)
  if (!pathname || shouldSkipProfileAppLaunchResume(pathname)) return

  const normalized = pathname.replace(/\/$/, '') || '/'
  const launchDone = isProfileAppLaunchResumeDone()

  if (normalized === '/') {
    if (shouldAbortLaunchResume(getPathname, 'root')) return
    if (launchDone) {
      if (shouldAbortLaunchResume(getPathname, 'root')) return
      replace('/default')
      return
    }
    const lastSlug = loadProfileLastActiveSlug()
    markProfileAppLaunchResumeDone()
    if (shouldAbortLaunchResume(getPathname, 'root')) return
    replace(lastSlug ? `/${lastSlug}` : '/default')
    return
  }

  if (launchDone) return
  if (!isProfileAppLaunchEntryPath(pathname)) return
  if (shouldAbortLaunchResume(getPathname, 'entry')) return

  const lastSlug = loadProfileLastActiveSlug()
  if (!lastSlug) return

  const targetPath = `/${lastSlug}`
  markProfileAppLaunchResumeDone()

  if (normalized === targetPath) return
  if (shouldAbortLaunchResume(getPathname, 'entry')) return

  replace(targetPath)
}
