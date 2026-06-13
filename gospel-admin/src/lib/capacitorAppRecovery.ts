import { Capacitor } from '@capacitor/core'
import { logger } from '@/lib/logger'

/** Session cap so a broken build cannot reload in a tight loop. */
export const CAPACITOR_RECOVERY_RELOAD_COUNT_KEY = 'gospel-capacitor-recovery-reload-count'

export const CAPACITOR_RECOVERY_RELOAD_MAX_PER_SESSION = 2

export const GOSPEL_APP_SURFACE_SELECTOR = '[data-gospel-surface]'

export function isCapacitorNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform()
}

type ReloadFn = () => void

let reloadImplementation: ReloadFn = () => {
  window.location.reload()
}

/** @internal Tests only */
export function __setReloadImplementationForTests(fn: ReloadFn | null): void {
  reloadImplementation = fn ?? (() => window.location.reload())
}

export function getCapacitorRecoveryReloadCount(): number {
  if (typeof sessionStorage === 'undefined') return 0
  try {
    const raw = sessionStorage.getItem(CAPACITOR_RECOVERY_RELOAD_COUNT_KEY)
    const parsed = raw ? Number.parseInt(raw, 10) : 0
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  } catch {
    return 0
  }
}

/** Reload the WebView once or twice per session when recovery is needed (blank page, load failure). */
export function attemptCapacitorRecoveryReload(reason: string): boolean {
  if (!isCapacitorNativeApp()) return false

  const count = getCapacitorRecoveryReloadCount()
  if (count >= CAPACITOR_RECOVERY_RELOAD_MAX_PER_SESSION) {
    return false
  }

  try {
    sessionStorage.setItem(CAPACITOR_RECOVERY_RELOAD_COUNT_KEY, String(count + 1))
  } catch {
    return false
  }

  logger.warn('Capacitor recovery reload:', reason)
  reloadImplementation()
  return true
}

/** True when the route has painted meaningful UI (explicit marker or static page `<main>`). */
export function hasGospelAppSurface(): boolean {
  if (typeof document === 'undefined') return false
  if (document.querySelector(GOSPEL_APP_SURFACE_SELECTOR) != null) return true
  const main = document.querySelector('main')
  return main != null && main.childElementCount > 0
}
