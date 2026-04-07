/**
 * @jest-environment jsdom
 */

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
  },
}))

import { getProfileHelpTourPopoverSafeInsets } from '@/lib/profileHelpTours'
import * as scrollToTocAnchor from '@/lib/scrollToTocAnchor'

describe('getProfileHelpTourPopoverSafeInsets (Capacitor Android)', () => {
  let getSafeSpy: jest.SpyInstance

  beforeEach(() => {
    getSafeSpy = jest.spyOn(scrollToTocAnchor, 'getSafeAreaInsetsPx')
  })

  afterEach(() => {
    getSafeSpy.mockRestore()
  })

  it('uses a larger bottom floor than mobile web Android (3-button nav / WebView)', () => {
    getSafeSpy.mockReturnValue({ top: 0, right: 0, bottom: 0, left: 0 })
    const prevUa = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value:
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    })
    try {
      expect(getProfileHelpTourPopoverSafeInsets().bottom).toBe(72)
    } finally {
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: prevUa })
    }
  })
})
