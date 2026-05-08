/**
 * Web Speech `boundary` events (and `charIndex`) often fire slightly **before** the sound reaches
 * the speaker/ear. Delaying underline + scroll updates by this amount pulls the UI back toward
 * perceived speech without access to real audio clocks.
 *
 * Skipped when the user prefers reduced motion (immediate updates).
 */
export const READ_ALONG_BOUNDARY_UI_LAG_MS = 180

/**
 * Chromium-class engines often report `charIndex` **several words ahead** of what listeners hear.
 * Underline that many whitespace-delimited tokens **behind** the reported word (cap: stop at chunk start).
 */
export const READ_ALONG_WORDS_TRAIL_ENGINE_CHAR_INDEX = 5
