'use client'

import { Capacitor } from '@capacitor/core'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import {
  dismissNativeAppInstallBanner,
  getMobileAppStoreHref,
  getNativeAppInstallBannerDismissed,
  subscribeNativeAppInstallBannerDismiss,
  shouldShowNativeAppInstallBanner,
} from '@/lib/nativeAppInstallBanner'

export function NativeAppInstallBanner() {
  const pathname = usePathname() ?? '/'
  const dismissed = useSyncExternalStore(
    subscribeNativeAppInstallBannerDismiss,
    getNativeAppInstallBannerDismissed,
    () => false
  )

  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''
  const maxTouchPoints =
    typeof navigator !== 'undefined' && typeof navigator.maxTouchPoints === 'number'
      ? navigator.maxTouchPoints
      : 0
  const storeHref = userAgent ? getMobileAppStoreHref(userAgent, maxTouchPoints) : null
  const visible =
    storeHref !== null &&
    shouldShowNativeAppInstallBanner({
      isNative: Capacitor.isNativePlatform(),
      pathname,
      dismissed,
      userAgent,
      maxTouchPoints,
    })

  if (!visible || !storeHref) {
    return null
  }

  return (
    <div
      role="region"
      aria-label="Get the mobile app"
      className="sticky top-0 z-50 print-hide border-b border-slate-300 bg-slate-100 pt-[env(safe-area-inset-top)] text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <p className="min-w-0 flex-1 text-sm leading-snug">
          Get the Gospel Presentation app for a better mobile experience.
        </p>
        <a
          href={storeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-md bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 active:bg-slate-800 dark:bg-slate-500 dark:hover:bg-slate-400"
        >
          Get app
        </a>
        <button
          type="button"
          onClick={dismissNativeAppInstallBanner}
          aria-label="Dismiss app install banner"
          className="shrink-0 rounded-md p-1.5 text-slate-600 hover:bg-slate-200 active:bg-slate-300 dark:text-slate-300 dark:hover:bg-slate-700 dark:active:bg-slate-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
