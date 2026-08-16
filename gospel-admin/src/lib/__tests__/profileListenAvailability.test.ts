/**
 * @jest-environment jsdom
 */

import { Capacitor } from '@capacitor/core'
import { isProfileResourceListenControlAvailable } from '@/lib/profileListenAvailability'
import { resetGospelListenSpeechEngineForTests } from '@/lib/gospelListenSpeechEngine'

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
    isPluginAvailable: jest.fn(() => false),
  },
}))

const androidUa =
  'Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36'

describe('isProfileResourceListenControlAvailable', () => {
  const originalUa = navigator.userAgent

  beforeEach(() => {
    resetGospelListenSpeechEngineForTests()
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('web')
    ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(false)
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: originalUa })
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
  })

  it('is false on native Android without the speech plugin', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: androidUa })
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('android')
    ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(false)
    expect(isProfileResourceListenControlAvailable()).toBe(false)
  })

  it('is true on native Android when the speech plugin is available', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: androidUa })
    ;(Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true)
    ;(Capacitor.getPlatform as jest.Mock).mockReturnValue('android')
    ;(Capacitor.isPluginAvailable as jest.Mock).mockReturnValue(true)
    expect(isProfileResourceListenControlAvailable()).toBe(true)
  })

  it('is true on Android Chrome when speechSynthesis exists', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: androidUa })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: jest.fn(), cancel: jest.fn() },
    })
    expect(isProfileResourceListenControlAvailable()).toBe(true)
  })

  it('is false on Android Chrome without speechSynthesis', () => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, value: androidUa })
    expect(isProfileResourceListenControlAvailable()).toBe(false)
  })

  it('is true on non-Android hosts regardless of speechSynthesis', () => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36',
    })
    expect(isProfileResourceListenControlAvailable()).toBe(true)
    delete (window as unknown as { speechSynthesis?: unknown }).speechSynthesis
    expect(isProfileResourceListenControlAvailable()).toBe(true)
  })
})
