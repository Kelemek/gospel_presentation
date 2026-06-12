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

/** Same-origin navigations that should stay in the Capacitor WebView (not Safari). */
export function shouldKeepCapacitorLinkInApp(url: URL, currentHref: string): boolean {
  let current: URL
  try {
    current = new URL(currentHref)
  } catch {
    return false
  }

  if (!isCapacitorSameSiteHost(url.host, current.host)) return false
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false

  // Hash-only anchors on the current page: let the browser scroll.
  if (
    url.pathname === current.pathname &&
    url.search === current.search &&
    Boolean(url.hash)
  ) {
    return false
  }

  return true
}

export type CapacitorLinkInterceptResult = {
  href: string
  anchor: HTMLAnchorElement
}

/** Resolve a same-origin in-app link from a DOM event, if any. */
export function resolveCapacitorInAppLinkFromEvent(
  event: Event,
  currentHref: string
): CapacitorLinkInterceptResult | null {
  const target = event.target
  if (!(target instanceof Element)) return null

  const anchor = target.closest('a')
  if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return null

  try {
    const url = new URL(anchor.href)
    if (!shouldKeepCapacitorLinkInApp(url, currentHref)) return null
    return { href: capacitorInAppHref(url), anchor }
  } catch {
    return null
  }
}
