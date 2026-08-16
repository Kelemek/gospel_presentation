import { isProfileReadAloudSpeechAvailable } from '@/lib/profileReadAloudSpeechEngine'

/**
 * Android Chrome / WebView fires `visualViewport` resize/scroll very often while the IME animates.
 * Memorization scroll nudges use this to avoid changing iOS behavior.
 */
export function isMemorizeAndroidWebHost(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

/**
 * When false, `ProfileResourceReadAloud` does not render the header **Listen** control.
 * Non-Android: always shown. Android Chrome: shown when Web Speech exists. Native Android: shown
 * only when the Capacitor speech plugin is present (old APKs stay hidden).
 * Help menu and full walkthrough use this so Listen tutorials only appear when the button exists.
 */
export function isProfileResourceListenControlAvailable(): boolean {
  if (!isMemorizeAndroidWebHost()) return true
  return isProfileReadAloudSpeechAvailable()
}

/** Safari / WKWebView — used to align scroll nudges with Android (instant) and avoid smooth + IME fighting. */
export function isMemorizeIosWebHost(): boolean {
  if (typeof navigator === 'undefined') return false
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return true
  // iPadOS 13+ desktop UA
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** iOS + Android: touching article content dismisses the in-page search keyboard (panel stays open). */
export function isProfileResourceSearchContentTouchBlurHost(): boolean {
  return isMemorizeIosWebHost() || isMemorizeAndroidWebHost()
}
