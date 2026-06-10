export const CAPACITOR_DEPLOY_VERSION_STORAGE_KEY = 'gospel-capacitor-deploy-version'

/** Poll interval while the Capacitor WebView session is open. */
export const CAPACITOR_DEPLOY_CHECK_INTERVAL_MS = 5 * 60 * 1000

export async function fetchAppDeployVersion(): Promise<string | null> {
  try {
    const response = await fetch('/api/app-deploy-version', { cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as { version?: unknown }
    return typeof data.version === 'string' && data.version.trim()
      ? data.version.trim()
      : null
  } catch {
    return null
  }
}

export function getStoredCapacitorDeployVersion(): string | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    return sessionStorage.getItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setStoredCapacitorDeployVersion(version: string): void {
  try {
    sessionStorage.setItem(CAPACITOR_DEPLOY_VERSION_STORAGE_KEY, version)
  } catch {
    // private mode / quota — reload still proceeds in reloadCapacitorWebViewForDeploy
  }
}

export function isCapacitorDeployVersionStale(
  storedVersion: string | null,
  remoteVersion: string | null
): boolean {
  if (!storedVersion || !remoteVersion) return false
  return storedVersion !== remoteVersion
}

/** Typical errors when an old JS bundle tries to load chunks from a new deploy. */
export function isLikelyStaleChunkLoadError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('loading chunk') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('importing a module script failed') ||
    normalized.includes('chunkloaderror')
  )
}

export function messageFromUnknownError(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason instanceof Error) return reason.message
  return ''
}

/** Update the stored deploy id, then reload the WebView (avoids a reload loop). */
export function reloadCapacitorWebViewForDeploy(remoteVersion: string): void {
  setStoredCapacitorDeployVersion(remoteVersion)
  window.location.reload()
}
