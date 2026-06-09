import {
  dismissNativeAppInstallBanner,
  getAppInstallBannerVariant,
  getMobileAppStoreHref,
  getNativeAppInstallBannerDismissed,
  isNativeAppInstallInfoPath,
  NATIVE_APP_INSTALL_BANNER_DISMISS_KEY,
  shouldShowNativeAppInstallBanner,
  subscribeNativeAppInstallBannerDismiss,
} from '@/lib/nativeAppInstallBanner'
import {
  INFO_PAGE_APP_STORE_URL,
  INFO_PAGE_PLAY_STORE_URL,
} from '@/lib/info-page-links'

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IPAD_DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
const ANDROID_TABLET_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-X900) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const WINDOWS_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const LINUX_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

describe('nativeAppInstallBanner', () => {
  describe('getMobileAppStoreHref', () => {
    it('returns App Store URL on iPhone', () => {
      expect(getMobileAppStoreHref(IOS_UA)).toBe(INFO_PAGE_APP_STORE_URL)
    })

    it('returns App Store URL on iPad', () => {
      expect(getMobileAppStoreHref(IPAD_UA)).toBe(INFO_PAGE_APP_STORE_URL)
    })

    it('returns App Store URL on iPad with desktop user agent when touch points indicate tablet', () => {
      expect(getMobileAppStoreHref(IPAD_DESKTOP_UA, 0)).toBeNull()
      expect(getMobileAppStoreHref(IPAD_DESKTOP_UA, 5)).toBe(INFO_PAGE_APP_STORE_URL)
    })

    it('returns Play Store URL on Android phone', () => {
      expect(getMobileAppStoreHref(ANDROID_UA)).toBe(INFO_PAGE_PLAY_STORE_URL)
    })

    it('returns Play Store URL on Android tablet', () => {
      expect(getMobileAppStoreHref(ANDROID_TABLET_UA)).toBe(INFO_PAGE_PLAY_STORE_URL)
    })

    it('returns null on desktop Mac without touch', () => {
      expect(getMobileAppStoreHref(DESKTOP_UA, 0)).toBeNull()
    })
  })

  describe('getAppInstallBannerVariant', () => {
    it('returns ios on iPhone', () => {
      expect(getAppInstallBannerVariant(IOS_UA)).toBe('ios')
    })

    it('returns ios on iPad with desktop user agent when touch points indicate tablet', () => {
      expect(getAppInstallBannerVariant(IPAD_DESKTOP_UA, 5)).toBe('ios')
    })

    it('returns android on Android phone and tablet', () => {
      expect(getAppInstallBannerVariant(ANDROID_UA)).toBe('android')
      expect(getAppInstallBannerVariant(ANDROID_TABLET_UA)).toBe('android')
    })

    it('returns desktop on Mac, Windows, and Linux without mobile UA', () => {
      expect(getAppInstallBannerVariant(DESKTOP_UA, 0)).toBe('desktop')
      expect(getAppInstallBannerVariant(WINDOWS_UA, 0)).toBe('desktop')
      expect(getAppInstallBannerVariant(LINUX_UA, 0)).toBe('desktop')
    })

    it('returns desktop on iPad desktop UA without touch points', () => {
      expect(getAppInstallBannerVariant(IPAD_DESKTOP_UA, 0)).toBe('desktop')
    })
  })

  describe('isNativeAppInstallInfoPath', () => {
    it('matches /info and nested paths', () => {
      expect(isNativeAppInstallInfoPath('/info')).toBe(true)
      expect(isNativeAppInstallInfoPath('/info/foo')).toBe(true)
      expect(isNativeAppInstallInfoPath('/default')).toBe(false)
    })
  })

  describe('shouldShowNativeAppInstallBanner', () => {
    const base = {
      isNative: false,
      pathname: '/default',
      dismissed: false,
      userAgent: IOS_UA,
    }

    it('shows on mobile web when not dismissed', () => {
      expect(shouldShowNativeAppInstallBanner(base)).toBe(true)
    })

    it('hides on Capacitor native', () => {
      expect(shouldShowNativeAppInstallBanner({ ...base, isNative: true })).toBe(false)
    })

    it('hides when dismissed', () => {
      expect(shouldShowNativeAppInstallBanner({ ...base, dismissed: true })).toBe(false)
    })

    it('hides on /info', () => {
      expect(shouldShowNativeAppInstallBanner({ ...base, pathname: '/info' })).toBe(false)
    })

    it('shows on desktop when not dismissed', () => {
      expect(shouldShowNativeAppInstallBanner({ ...base, userAgent: DESKTOP_UA })).toBe(true)
    })
  })

  describe('dismiss subscription', () => {
    beforeEach(() => {
      window.localStorage.removeItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY)
    })

    it('notifies subscribers on dismiss and on cross-tab storage events', () => {
      const seen: boolean[] = []
      const unsubscribe = subscribeNativeAppInstallBannerDismiss(() => {
        seen.push(getNativeAppInstallBannerDismissed())
      })

      expect(getNativeAppInstallBannerDismissed()).toBe(false)
      dismissNativeAppInstallBanner()
      expect(seen).toEqual([true])

      window.localStorage.removeItem(NATIVE_APP_INSTALL_BANNER_DISMISS_KEY)
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: NATIVE_APP_INSTALL_BANNER_DISMISS_KEY,
          newValue: null,
          storageArea: window.localStorage,
        })
      )
      expect(seen).toEqual([true, false])

      unsubscribe()
    })
  })
})
