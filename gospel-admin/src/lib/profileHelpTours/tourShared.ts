import 'driver.js/dist/driver.css'
import { Capacitor } from '@capacitor/core'
import type { ProfileFeatureTourOptions } from './tourSharedDriver'

export * from './tourSharedSelectors'
export * from './tourSharedDriver'
export * from './tourSharedDomHelpers'

/**
 * Public template slug for "Marriage: A Biblical Perspective" (matches DB / admin shared profiles).
 * Tour opens this profile from Resources when it is listed.
 */
export const MARRIAGE_SEMINAR_PROFILE_SLUG = 'marriagechapter1'

export const MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY = 'gospel-marriage-seminar-tour-resume-v1'

const MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2 = 2

type MarriageSeminarTourResumePayloadV2 = {
  v: typeof MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2
  captive: boolean
  /**
   * When true, the marriage segment was started from the **full walkthrough**—after post-navigation steps finish,
   * run thank-you and return to the stored start slug (callbacks are reattached in `tryStartMarriageSeminarTourAfterNavigation`).
   */
  fullWalkthroughChain: boolean
}

/** @internal Exported for unit tests (legacy string + JSON resume payloads). */
export function parseMarriageSeminarTourResumeStorageValue(raw: string | null): MarriageSeminarTourResumePayloadV2 | null {
  if (raw == null || raw === '') return null
  try {
    const j = JSON.parse(raw) as Partial<MarriageSeminarTourResumePayloadV2>
    if (
      j?.v === MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2 &&
      typeof j.captive === 'boolean' &&
      typeof j.fullWalkthroughChain === 'boolean'
    ) {
      return {
        v: MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2,
        captive: j.captive,
        fullWalkthroughChain: j.fullWalkthroughChain,
      }
    }
  } catch {
    /* legacy plain strings */
  }
  if (raw === 'pending') {
    return {
      v: MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2,
      captive: false,
      fullWalkthroughChain: false,
    }
  }
  if (raw === 'full-walkthrough') {
    return {
      v: MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2,
      captive: true,
      fullWalkthroughChain: true,
    }
  }
  return null
}

export function serializeMarriageSeminarTourResumeForNavigation(options?: ProfileFeatureTourOptions): string {
  const captive = options?.captive === true
  return JSON.stringify({
    v: MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2,
    captive,
    fullWalkthroughChain: captive,
  } satisfies MarriageSeminarTourResumePayloadV2)
}

/** Scripture reader tour always runs on the public default presentation (`/default`) so steps match a known outline. */
export const SCRIPTURE_READER_TOUR_DEFAULT_SLUG = 'default'

export const SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY = 'gospel-scripture-reader-tour-resume-v1'
export const WORD_STUDY_TOUR_RESUME_STORAGE_KEY = 'gospel-word-study-tour-resume-v1'
/** Same payload shape as scripture reader resume; only one of these keys should be set when navigating to `/default`. */
export const MEMORIZE_TOUR_RESUME_STORAGE_KEY = 'gospel-memorize-tour-resume-v1'

/** Remember `[slug]` when a full walkthrough starts so the closing step can return there. */
export const FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY = 'gospel-full-walkthrough-start-slug-v1'

export type FullWalkthroughStartSlugPayloadV1 = {
  v: 1
  slug: string
}

export type ProfileHelpTourClientNavigate = (path: string) => void

/**
 * On Capacitor, `window.location.assign` can open the system browser for same-origin paths.
 * The root layout registers `router.push` here so scripture-reader jumps and full-walkthrough
 * return navigation stay inside the WebView.
 */
let profileHelpTourClientNavigate: ProfileHelpTourClientNavigate | null = null

export function setProfileHelpTourClientNavigate(fn: ProfileHelpTourClientNavigate | null): void {
  profileHelpTourClientNavigate = fn
}

/** Indirection so Jest can mock navigation (`window.location.assign` is not writable in jsdom). */
export const scriptureReaderTourNavigation = {
  assign(path: string): void {
    if (typeof window === 'undefined') return
    if (Capacitor.isNativePlatform() && profileHelpTourClientNavigate) {
      profileHelpTourClientNavigate(path)
      return
    }
    window.location.assign(path)
  },
}

/** First path segment of a presentation URL (`/[slug]`), for full-walkthrough return navigation. */
export function getPresentationSlugFromPathname(pathname: string): string {
  if (typeof pathname !== 'string' || pathname.length === 0) {
    return SCRIPTURE_READER_TOUR_DEFAULT_SLUG
  }
  const noQueryHash = pathname.split(/[?#]/)[0] ?? pathname
  const parts = noQueryHash.replace(/\/$/, '').split('/').filter(Boolean)
  return parts[0] ?? SCRIPTURE_READER_TOUR_DEFAULT_SLUG
}

export function clearFullWalkthroughStartSlug(): void {
  try {
    sessionStorage.removeItem(FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function readFullWalkthroughStartSlug(): string | null {
  try {
    const raw = sessionStorage.getItem(FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as FullWalkthroughStartSlugPayloadV1
    if (p?.v !== 1 || typeof p.slug !== 'string' || p.slug.length === 0) return null
    return p.slug
  } catch {
    return null
  }
}

/** Cap consecutive top-level template blocks (each block is one tour step listing all links in that run). */
export const MAX_RESOURCE_TEMPLATE_BLOCKS = 8
/** Cap category folders that each get one subsection step (lists all templates in the folder). */
export const MAX_RESOURCE_CATEGORY_STEPS = 6

