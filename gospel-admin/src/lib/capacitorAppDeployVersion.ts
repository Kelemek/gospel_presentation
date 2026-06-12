export const CAPACITOR_DEPLOY_VERSION_STORAGE_KEY = 'gospel-capacitor-deploy-version'

/** How many changelog entries the user has already been shown (localStorage). */
export const CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY =
  'gospel-capacitor-deploy-changelog-seen-count'

/** Last deploy version the user was notified about across app restarts (localStorage). */
export const CAPACITOR_DEPLOY_ACK_VERSION_KEY = 'gospel-capacitor-deploy-ack-version'

/** Poll interval while the Capacitor WebView session is open. */
export const CAPACITOR_DEPLOY_CHECK_INTERVAL_MS = 60 * 1000

export type AppDeployInfo = {
  version: string | null
  changelog: string[]
}

function parseDeployChangelog(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export async function fetchAppDeployInfo(): Promise<AppDeployInfo> {
  try {
    const response = await fetch('/api/app-deploy-version', { cache: 'no-store' })
    if (!response.ok) return { version: null, changelog: [] }
    const data = (await response.json()) as {
      version?: unknown
      changelog?: unknown
    }
    const version =
      typeof data.version === 'string' && data.version.trim() ? data.version.trim() : null
    const changelog = parseDeployChangelog(data.changelog)
    return { version, changelog }
  } catch {
    return { version: null, changelog: [] }
  }
}

export function getSeenChangelogCount(): number {
  if (typeof localStorage === 'undefined') return 0
  try {
    const raw = localStorage.getItem(CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY)
    if (!raw) return 0
    const parsed = Number.parseInt(raw, 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
  } catch {
    return 0
  }
}

export function setSeenChangelogCount(count: number): void {
  if (!Number.isFinite(count) || count < 0) return
  try {
    localStorage.setItem(CAPACITOR_DEPLOY_CHANGELOG_SEEN_COUNT_KEY, String(Math.floor(count)))
  } catch {
    // private mode / quota
  }
}

export function getAcknowledgedDeployVersion(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(CAPACITOR_DEPLOY_ACK_VERSION_KEY)
  } catch {
    return null
  }
}

export function setAcknowledgedDeployVersion(version: string): void {
  try {
    localStorage.setItem(CAPACITOR_DEPLOY_ACK_VERSION_KEY, version)
  } catch {
    // private mode / quota
  }
}

export function getUnseenChangelogMessages(changelog: string[], seenCount: number): string[] {
  if (!changelog.length) return []
  const safeSeen = Math.max(0, Math.min(seenCount, changelog.length))
  return changelog.slice(safeSeen)
}

/** Survives React remounts within the same WebView / browser tab JS context. */
let webViewSessionDeployBaseline: string | null = null

export function resetWebViewSessionDeployBaseline(): void {
  webViewSessionDeployBaseline = null
}

/** First deploy version seen this WebView JS context; not advanced on later syncs. */
function captureSessionStartDeployBaselineIfUnset(version: string): void {
  if (webViewSessionDeployBaseline === null) {
    webViewSessionDeployBaseline = version
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

/** Session baseline for deploy polling; falls back to the in-memory WebView baseline. */
export function getEffectiveDeployBaseline(inMemoryFallback: string | null = null): string | null {
  const stored = getStoredCapacitorDeployVersion()
  if (stored) {
    captureSessionStartDeployBaselineIfUnset(stored)
    return stored
  }
  if (inMemoryFallback) {
    captureSessionStartDeployBaselineIfUnset(inMemoryFallback)
    return inMemoryFallback
  }
  return webViewSessionDeployBaseline
}

export function setStoredCapacitorDeployVersion(version: string): void {
  captureSessionStartDeployBaselineIfUnset(version)
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
