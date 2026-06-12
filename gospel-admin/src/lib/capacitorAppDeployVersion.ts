export const CAPACITOR_DEPLOY_VERSION_STORAGE_KEY = 'gospel-capacitor-deploy-version'

/** Poll interval while the Capacitor WebView session is open. */
export const CAPACITOR_DEPLOY_CHECK_INTERVAL_MS = 60 * 1000

export type AppDeployInfo = {
  version: string | null
  message: string | null
}

export async function fetchAppDeployInfo(): Promise<AppDeployInfo> {
  try {
    const response = await fetch('/api/app-deploy-version', { cache: 'no-store' })
    if (!response.ok) return { version: null, message: null }
    const data = (await response.json()) as { version?: unknown; message?: unknown }
    const version =
      typeof data.version === 'string' && data.version.trim() ? data.version.trim() : null
    const message =
      typeof data.message === 'string' && data.message.trim() ? data.message.trim() : null
    return { version, message }
  } catch {
    return { version: null, message: null }
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
    // private mode / quota
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
    normalized.includes('chunkloaderror') ||
    normalized.includes('failed to load script') ||
    normalized.includes('error loading dynamically imported module') ||
    normalized.includes('unable to preload css') ||
    normalized.includes('missing required error components') ||
    normalized.includes('unexpected token') && normalized.includes('<!') ||
    normalized.includes('hydration failed')
  )
}

export function messageFromUnknownError(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason instanceof Error) return reason.message
  return ''
}
