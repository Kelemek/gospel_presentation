/** Hosts that should stay inside the Capacitor WebView (prod + dev). */
export function isCapacitorSameSiteHost(urlHost: string, currentHost: string): boolean {
  if (urlHost === currentHost) return true

  const normalize = (host: string) => host.replace(/^www\./i, '').toLowerCase()
  const a = normalize(urlHost)
  const b = normalize(currentHost)
  if (a === b) return true

  const siteRoot = (host: string): string | null => {
    if (host === 'cp-church.org' || host.endsWith('.cp-church.org')) return 'cp-church.org'
    if (host === 'localhost' || host.startsWith('localhost:')) return 'localhost'
    if (host === '10.0.2.2' || host.startsWith('10.0.2.2:')) return '10.0.2.2'
    return null
  }

  const rootA = siteRoot(a)
  const rootB = siteRoot(b)
  return rootA != null && rootA === rootB
}

export function capacitorInAppHref(url: URL): string {
  return `${url.pathname}${url.search}${url.hash}`
}

export function normalizeCapacitorPathname(pathname: string): string {
  const path = pathname || '/'
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path
}

export function isSameDocumentCapacitorUrl(url: URL, current: URL): boolean {
  return (
    normalizeCapacitorPathname(url.pathname) === normalizeCapacitorPathname(current.pathname) &&
    url.search === current.search
  )
}

export type CapacitorKeepLinksInAppOptions = {
  /** Same-document #anchors (Capacitor native opens Safari if left to the WebView). */
  interceptSamePageHash?: boolean
}

/** Same-origin navigations that should stay in the Capacitor WebView (not Safari). */
export function shouldKeepCapacitorLinkInApp(
  url: URL,
  currentHref: string,
  options?: CapacitorKeepLinksInAppOptions
): boolean {
  let current: URL
  try {
    current = new URL(currentHref)
  } catch {
    return false
  }

  if (!isCapacitorSameSiteHost(url.host, current.host)) return false
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false

  if (isSameDocumentCapacitorUrl(url, current) && url.hash) {
    return options?.interceptSamePageHash === true
  }

  return true
}

export function capacitorHashAnchorIdFromInAppHref(href: string): string | null {
  const hashIndex = href.indexOf('#')
  if (hashIndex === -1) return null
  const raw = href.slice(hashIndex + 1)
  return raw ? decodeURIComponent(raw) : null
}

/** True when href is a same-document fragment link (e.g. profile section anchor). */
export function isSameDocumentCapacitorInAppHref(href: string, currentHref: string): boolean {
  try {
    const url = new URL(href, currentHref)
    const current = new URL(currentHref)
    return isSameDocumentCapacitorUrl(url, current) && Boolean(url.hash)
  } catch {
    return false
  }
}

export type CapacitorLinkInterceptResult = {
  href: string
  anchor: HTMLAnchorElement
}

/** Finger movement above this (px) on a link touch is treated as scroll, not navigation. */
export const CAPACITOR_LINK_TAP_MOVE_THRESHOLD_PX = 10

export function exceedsCapacitorLinkTapMoveThreshold(
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
  thresholdPx: number = CAPACITOR_LINK_TAP_MOVE_THRESHOLD_PX
): boolean {
  const dx = clientX - startX
  const dy = clientY - startY
  return dx * dx + dy * dy > thresholdPx * thresholdPx
}

/** Resolve a same-origin in-app link from a DOM event, if any. */
export function resolveCapacitorInAppLinkFromEvent(
  event: Event,
  currentHref: string,
  options?: CapacitorKeepLinksInAppOptions
): CapacitorLinkInterceptResult | null {
  const target = event.target
  if (!(target instanceof Element)) return null

  const anchor = target.closest('a')
  if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return null

  try {
    const url = new URL(anchor.href)
    if (!shouldKeepCapacitorLinkInApp(url, currentHref, options)) return null
    return { href: capacitorInAppHref(url), anchor }
  } catch {
    return null
  }
}
