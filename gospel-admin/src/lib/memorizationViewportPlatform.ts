/**
 * Android Chrome / WebView fires `visualViewport` resize/scroll very often while the IME animates.
 * Memorization scroll nudges use this to avoid changing iOS behavior.
 */
export function isMemorizeAndroidWebHost(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}
