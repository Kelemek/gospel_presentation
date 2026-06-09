import {
  INFO_PAGE_APP_STORE_URL,
  INFO_PAGE_PLAY_STORE_URL,
} from '@/lib/info-page-links'

export const NATIVE_APP_INSTALL_BANNER_DISMISS_KEY = 'gospel-native-app-banner-dismissed'

const dismissListeners = new Set<() => void>()
let storageListenerAdded = false

function notifyDismissListeners() {
  dismissListeners.forEach((listener) => listener())
}

function onDismissStorage(event: StorageEvent) {
  if (event.key === null || event.key === NATIVE_APP_INSTALL_BANNER_DISMISS_KEY) {
    notifyDismissListeners()
  }
}

export function getNativeAppInstallBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY) === '1'
}

/** Subscribe to dismiss changes (same tab + cross-tab via `storage`). */
export function subscribeNativeAppInstallBannerDismiss(listener: () => void): () => void {
  dismissListeners.add(listener)
  if (typeof window !== 'undefined' && dismissListeners.size === 1) {
    window.addEventListener('storage', onDismissStorage)
    storageListenerAdded = true
  }
  return () => {
    dismissListeners.delete(listener)
    if (typeof window !== 'undefined' && dismissListeners.size === 0 && storageListenerAdded) {
      window.removeEventListener('storage', onDismissStorage)
      storageListenerAdded = false
    }
  }
}

export function dismissNativeAppInstallBanner(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY, '1')
  notifyDismissListeners()
}

const IOS_PHONE_UA = /iPhone|iPod/i
const IOS_TABLET_UA = /iPad/i
const ANDROID_UA = /Android/i

/** iPadOS 13+ “Request Desktop Website” reports Macintosh; touch points distinguish iPad from Mac. */
export function isIosMobileOrTabletUserAgent(userAgent: string, maxTouchPoints = 0): boolean {
  if (IOS_PHONE_UA.test(userAgent) || IOS_TABLET_UA.test(userAgent)) return true
  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1
}

/** Android phones and tablets (tablet UAs omit “Mobile”). */
export function isAndroidMobileOrTabletUserAgent(userAgent: string): boolean {
  return ANDROID_UA.test(userAgent)
}

/** True when pathname is the public /info app-promo page (no banner there). */
export function isNativeAppInstallInfoPath(pathname: string): boolean {
  return pathname === '/info' || pathname.startsWith('/info/')
}

export function getMobileAppStoreHref(userAgent: string, maxTouchPoints = 0): string | null {
  if (isIosMobileOrTabletUserAgent(userAgent, maxTouchPoints)) {
    return INFO_PAGE_APP_STORE_URL
  }
  if (isAndroidMobileOrTabletUserAgent(userAgent)) {
    return INFO_PAGE_PLAY_STORE_URL
  }
  return null
}

export function shouldShowNativeAppInstallBanner(options: {
  isNative: boolean
  pathname: string
  dismissed: boolean
  userAgent: string
  maxTouchPoints?: number
}): boolean {
  const { isNative, pathname, dismissed, userAgent, maxTouchPoints = 0 } = options
  if (isNative) return false
  if (dismissed) return false
  if (isNativeAppInstallInfoPath(pathname)) return false
  return getMobileAppStoreHref(userAgent, maxTouchPoints) !== null
}
