import { Capacitor } from '@capacitor/core'

/** Marks an `<a>` click that must perform a full document load (deploy reload), not `router.push`. */
export const CAPACITOR_ALLOW_FULL_NAVIGATION_ATTR = 'data-capacitor-allow-full-navigation'

/** Cache-bust query param stripped after a deploy hard reload lands. */
export const CAPACITOR_DEPLOY_RELOAD_QUERY = '_capDeploy'

export function isCapacitorFullNavigationAnchor(anchor: Element): boolean {
  return anchor instanceof HTMLAnchorElement && anchor.hasAttribute(CAPACITOR_ALLOW_FULL_NAVIGATION_ATTR)
}

/** Path + search + hash for a same-origin hard reload (optional deploy id for cache bust). */
export function buildCapacitorHardReloadHref(deployVersion?: string): string {
  if (typeof window === 'undefined') return '/'
  const params = new URLSearchParams(window.location.search)
  if (deployVersion) {
    params.set(CAPACITOR_DEPLOY_RELOAD_QUERY, deployVersion)
  }
  const qs = params.toString()
  return `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
}

/**
 * Full WebView document reload on Capacitor native without `window.location.reload()` /
 * `location.assign`, which can hand the URL to the system browser on iOS.
 *
 * Uses a synthetic same-origin link click that bypasses `CapacitorKeepLinksInApp` so the
 * WebView performs a real navigation and fetches fresh HTML/JS from the server.
 */
export function hardReloadCapacitorWebViewInApp(deployVersion?: string): boolean {
  if (typeof window === 'undefined' || !Capacitor.isNativePlatform()) {
    return false
  }

  const anchor = document.createElement('a')
  anchor.href = buildCapacitorHardReloadHref(deployVersion)
  anchor.setAttribute(CAPACITOR_ALLOW_FULL_NAVIGATION_ATTR, 'true')
  anchor.setAttribute('aria-hidden', 'true')
  anchor.tabIndex = -1
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return true
}

/** Reload inside the Capacitor WebView when on native. Returns whether reload was triggered. */
export function reloadCapacitorWebViewInApp(deployVersion?: string): boolean {
  return hardReloadCapacitorWebViewInApp(deployVersion)
}
