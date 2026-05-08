/**
 * Web Speech `boundary` events (and `charIndex`) often fire slightly **before** the sound reaches
 * the speaker/ear. Delaying underline + scroll updates pulls the UI toward perceived speech without
 * a real audio clock.
 *
 * Skipped when the user prefers reduced motion (immediate updates).
 *
 * Values are **heuristic** and split by engine: Chromium often reports `charIndex` ahead of audio;
 * WebKit Safari often fires **sparser** boundaries, so a shorter word trail feels less “stuck.”
 */

import { isMemorizeIosWebHost } from '@/lib/memorizationViewportPlatform'

/** Fallback when UA is unknown (e.g. Firefox, tests, some embedded WebViews). */
export const READ_ALONG_BOUNDARY_UI_LAG_MS_DEFAULT = 100

/** Fallback word trail when UA is unknown. */
export const READ_ALONG_WORDS_TRAIL_DEFAULT = 3

const READ_ALONG_BOUNDARY_UI_LAG_MS_CHROMIUM = 100
const READ_ALONG_WORDS_TRAIL_CHROMIUM = 4

const READ_ALONG_BOUNDARY_UI_LAG_MS_SAFARI = 90
const READ_ALONG_WORDS_TRAIL_SAFARI = 2

function isReadAlongLikelyChromium(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Chrome|CriOS|Edg|OPR|Brave/i.test(navigator.userAgent)
}

/** Desktop Safari, iOS Safari / WKWebView — not Chrome, Edge, Opera, Brave on those platforms. */
function isReadAlongLikelyWebKitSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  if (isMemorizeIosWebHost()) return true
  const ua = navigator.userAgent
  if (/Chrome|CriOS|Edg|OPR|Brave/i.test(ua)) return false
  return /Safari/i.test(ua)
}

export function getReadAlongBoundaryUiLagMs(): number {
  if (typeof navigator === 'undefined') return READ_ALONG_BOUNDARY_UI_LAG_MS_DEFAULT
  if (isReadAlongLikelyChromium()) return READ_ALONG_BOUNDARY_UI_LAG_MS_CHROMIUM
  if (isReadAlongLikelyWebKitSafari()) return READ_ALONG_BOUNDARY_UI_LAG_MS_SAFARI
  return READ_ALONG_BOUNDARY_UI_LAG_MS_DEFAULT
}

export function getReadAlongWordsTrail(): number {
  if (typeof navigator === 'undefined') return READ_ALONG_WORDS_TRAIL_DEFAULT
  if (isReadAlongLikelyChromium()) return READ_ALONG_WORDS_TRAIL_CHROMIUM
  if (isReadAlongLikelyWebKitSafari()) return READ_ALONG_WORDS_TRAIL_SAFARI
  return READ_ALONG_WORDS_TRAIL_DEFAULT
}
