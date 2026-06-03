import type { PublicResourceItem } from '@/lib/supabase-data-service'
import { Capacitor } from '@capacitor/core'

export const PUBLIC_RESOURCES_MENU_CACHE_KEY = 'gospel-public-resources-menu:v1'

type CachePayload = {
  v: 1
  items: PublicResourceItem[]
}

let inflight: Promise<PublicResourceItem[]> | null = null

/** Web always loads; native skips when logged in (Resources menu hidden in that case). */
export function shouldLoadPublicResourcesMenu(isLoggedIn: boolean): boolean {
  return !(isLoggedIn && Capacitor.isNativePlatform())
}

export function readPublicResourcesMenuCache(): PublicResourceItem[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(PUBLIC_RESOURCES_MENU_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return null
    const payload = parsed as Partial<CachePayload>
    if (payload.v !== 1 || !Array.isArray(payload.items)) return null
    return payload.items
  } catch {
    return null
  }
}

export function writePublicResourcesMenuCache(items: PublicResourceItem[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload: CachePayload = { v: 1, items }
    window.sessionStorage.setItem(PUBLIC_RESOURCES_MENU_CACHE_KEY, JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

async function fetchPublicResourcesMenuItemsFromNetwork(): Promise<PublicResourceItem[]> {
  const res = await fetch('/api/profiles/public-templates')
  if (!res.ok) return []
  const data: unknown = await res.json()
  if (!data || typeof data !== 'object' || !('items' in data)) return []
  const { items } = data as { items: unknown }
  if (!Array.isArray(items)) return []
  return items as PublicResourceItem[]
}

function fetchAndCachePublicResourcesMenuItems(): Promise<PublicResourceItem[]> {
  if (!inflight) {
    inflight = fetchPublicResourcesMenuItemsFromNetwork()
      .then((items) => {
        writePublicResourcesMenuCache(items)
        return items
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Fetches public resources for the slide-out menu (deduped; updates session cache). */
export async function loadPublicResourcesMenuItems(): Promise<PublicResourceItem[]> {
  return fetchAndCachePublicResourcesMenuItems()
}

/** Warm session cache while the profile page is open (shares in-flight fetch with TOC). */
export function prefetchPublicResourcesMenu(): void {
  void loadPublicResourcesMenuItems()
}

/** @internal test helper */
export function resetPublicResourcesMenuClientForTests(): void {
  inflight = null
}
