import { driver, type Alignment, type Config, type DriveStep, type Driver, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Capacitor } from '@capacitor/core'
import type { PublicResourceItem } from '@/lib/supabase-data-service'
import {
  groupPublicResourceItems,
  publicResourceItemsForResourcesMenu,
  resolveBibleReaderMenuTitle,
} from '@/lib/groupPublicResourceItems'
import { loadBookmarks } from '@/lib/profileBookmarksStorage'
import {
  applyThemePersistenceSnapshot,
  readThemePersistenceSnapshot,
} from '@/contexts/ThemeContext'
import {
  GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT,
  GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT,
} from '@/lib/bookmarksPanelCloseEvent'
import {
  getProfileHeaderScrollOffset,
  getSafeAreaInsetsPx,
  scrollToTocAnchor,
} from '@/lib/scrollToTocAnchor'
import { loadMemorizedVerses } from '@/lib/verseMemorizationStorage'
import { isProfileResourceListenControlAvailable } from '@/lib/memorizationViewportPlatform'

const BOOKMARKS_TRIGGER = '[data-tour="bookmarks-trigger"]'
const BOOKMARKS_PANEL = '[data-tour="bookmarks-panel"]'
const BOOKMARKS_ADD = '[data-tour="bookmarks-add"]'
const BOOKMARKS_ROW = '[data-tour="bookmarks-row"]'
const BOOKMARKS_REMOVE = '[data-tour="bookmarks-remove"]'
const ALERT_MODAL_CONFIRM = '[data-tour="alert-modal-confirm"]'
const THEME_TOGGLE = '[data-tour="theme-toggle"]'
const PROFILE_RESOURCE_READ_ALOUD = '[data-tour="profile-resource-read-aloud"]'
const PROFILE_RESOURCE_LISTEN_DIALOG = '#profile-resource-listen-controls-dialog'
const PROFILE_HIGHLIGHTS_TRIGGER = '[data-tour="highlights-trigger"]'
const PROFILE_HIGHLIGHTS_PANEL = '[data-tour="highlights-panel"]'
const PROFILE_SHARE_RESOURCE = '[data-tour="profile-share-resource"]'

const PROFILE_MENU_BUTTON = '[data-tour="profile-menu-button"]'
const PROFILE_SLIDEOUT_MENU = '[data-tour="profile-slideout-menu"]'
const TOC_RESOURCES_TOGGLE = '[data-tour="toc-resources-toggle"]'
const TOC_BIBLE_READER = '[data-tour="toc-bible-reader"]'
const TOC_TEXT_SIZE_TOGGLE = '[data-tour="toc-text-size-toggle"]'
const TEXT_SIZE_PANEL = '[data-tour="text-size-panel"]'
const TOC_PRINT_VERSION = '[data-tour="toc-print-version"]'
const TOC_BIBLE_TRANSLATION_TOGGLE = '[data-tour="toc-bible-translation-toggle"]'
const BIBLE_TRANSLATION_PANEL = '[data-tour="bible-translation-panel"]'
const TOC_MEMORIZE_TOGGLE = '[data-tour="toc-memorize-toggle"]'
const MEMORIZE_ADD_VERSE = '[data-tour="memorize-add-verse"]'
const MEMORIZE_PANEL = '[data-tour="memorize-panel"]'
const ADD_MEMORIZE_MODAL = '[data-tour="add-memorize-modal"]'
const ADD_MEMORIZE_TESTAMENTS = '[data-tour="add-memorize-testaments"]'
const ADD_MEMORIZE_BOOK = '[data-tour="add-memorize-book"]'
const ADD_MEMORIZE_CHAPTER = '[data-tour="add-memorize-chapter"]'
const ADD_MEMORIZE_VERSE = '[data-tour="add-memorize-verse"]'
const ADD_MEMORIZE_ADD = '[data-tour="add-memorize-add"]'
const MEMORIZE_PRACTICE_DIALOG = '[data-tour="memorize-practice-dialog"]'
const MEMORIZE_START_PRACTICE = '[data-tour="memorize-start-practice"]'
const MEMORIZE_PRACTICE_MODE_TYPE = '[data-tour="memorize-practice-mode-type"]'
const MEMORIZE_PRACTICE_MODE_INITIALS = '[data-tour="memorize-practice-mode-initials"]'
const MEMORIZE_PRACTICE_MODE_WORD = '[data-tour="memorize-practice-mode-word"]'
const MEMORIZE_PRACTICE_MODE_REORDER = '[data-tour="memorize-practice-mode-reorder"]'
const MEMORIZE_PRACTICE_MODE_PICKER = '[data-tour="memorize-practice-mode-picker"]'
const MEMORIZE_PRACTICE_CLOSE = '[data-tour="memorize-practice-close"]'
/** Open **Listen** in the practice session header; tour uses this so read-aloud steps can be skipped (e.g. non-ESV on Android) via `moveTo`. */
const MEMORIZE_LISTEN_OPEN = '[data-tour="memorize-listen-open"]'
const MEMORIZE_LISTEN_PASSAGE = '[data-testid="memorize-listen-passage"]'
const MEMORIZE_LISTEN_REPEAT = '[data-testid="memorize-listen-repeat"]'
const MEMORIZE_LISTEN_SPEED = '[data-testid="memorize-listen-speed"]'
const MEMORIZE_LISTEN_CLOSE = '[data-tour="memorize-listen-close"]'
/** Number of driver.js steps for Listen → read-aloud panel walkthrough; must match the block in `runMemorizeFeatureTourOnCurrentPage`. */
const MEMORIZE_READ_ALOUD_TOUR_STEPS = 5
const TOC_SECTION_LINKS = '[data-tour="toc-section-links"]'
const TOC_VERSE_PINS = '[data-tour="toc-verse-pins"]'
const TOC_RESET_PROGRESS = '[data-tour="toc-reset-progress"]'
const SCRIPTURE_CARD = '[data-tour="scripture-card"]'
const SCRIPTURE_MODAL_TOOLBAR = '[data-tour="scripture-modal-toolbar"]'
const SCRIPTURE_MODAL_VERSE_BODY = '[data-tour="scripture-modal-verse-body"]'
const SCRIPTURE_MODAL_COMPARE = '[data-tour="scripture-modal-compare"]'
const SCRIPTURE_MODAL_COMPARE_COLUMNS = '[data-tour="scripture-modal-compare-columns"]'
const SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE = '[data-tour="scripture-modal-verse-chapter-toggle"]'
const SCRIPTURE_MODAL_CHAPTER_BODY = '[data-tour="scripture-modal-chapter-body"]'
/** Scrollable passage area — must be the driver.js spotlight during chapter context so wheel/touch scroll works (overlay only restores pointer-events on the active element and its subtree). */
const SCRIPTURE_MODAL_SCROLL_AREA = '[data-tour="scripture-modal-scroll-area"]'
const SCRIPTURE_MODAL_PREV = '[data-tour="scripture-modal-prev"]'
const SCRIPTURE_MODAL_NEXT = '[data-tour="scripture-modal-next"]'
const SCRIPTURE_MODAL_CLOSE = '[data-tour="scripture-modal-close"]'
const SCRIPTURE_MODAL_MEMORIZE = '[data-tour="scripture-modal-memorize"]'
const SCRIPTURE_MODAL_PIN_COLOR = '[data-tour="scripture-modal-pin-color"]'
const SCRIPTURE_MODAL_WORD_STUDY = '[data-tour="scripture-modal-word-study"]'
const SCRIPTURE_MODAL_WORD_STUDY_OVERLAY = '[data-tour="scripture-modal-word-study-overlay"]'
const SCRIPTURE_MODAL_WORD_STUDY_PANEL = '[data-tour="scripture-modal-word-study-panel"]'
const SCRIPTURE_MODAL_WORD_STUDY_LEXICON = '[data-tour="scripture-modal-word-study-lexicon"]'
const ALERT_MODAL_OK = '[data-tour="alert-modal-ok"]'
const SCRIPTURE_VERSE_PINNED_CARD = '[data-scripture-verse-pinned="true"]'
const SCRIPTURE_PROGRESS_UNPIN = '[data-tour="scripture-progress-unpin"]'
const RESOURCES_LIST_PANEL = '[data-tour="resources-list-panel"]'
const RESOURCE_CATEGORY = '[data-tour="resource-category"]'
const PROFILE_SECTION_EXTERNAL_LINK = '[data-tour="profile-section-external-link"]'

/**
 * Public template slug for "Marriage: A Biblical Perspective" (matches DB / admin shared profiles).
 * Tour opens this profile from Resources when it is listed.
 */
export const MARRIAGE_SEMINAR_PROFILE_SLUG = 'marriagechapter1'

const MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY = 'gospel-marriage-seminar-tour-resume-v1'

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

function serializeMarriageSeminarTourResumeForNavigation(options?: ProfileFeatureTourOptions): string {
  const captive = options?.captive === true
  return JSON.stringify({
    v: MARRIAGE_SEMINAR_TOUR_RESUME_PAYLOAD_V2,
    captive,
    fullWalkthroughChain: captive,
  } satisfies MarriageSeminarTourResumePayloadV2)
}

/** Scripture reader tour always runs on the public default presentation (`/default`) so steps match a known outline. */
export const SCRIPTURE_READER_TOUR_DEFAULT_SLUG = 'default'

const SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY = 'gospel-scripture-reader-tour-resume-v1'
const WORD_STUDY_TOUR_RESUME_STORAGE_KEY = 'gospel-word-study-tour-resume-v1'
/** Same payload shape as scripture reader resume; only one of these keys should be set when navigating to `/default`. */
const MEMORIZE_TOUR_RESUME_STORAGE_KEY = 'gospel-memorize-tour-resume-v1'

/** Remember `[slug]` when a full walkthrough starts so the closing step can return there. */
const FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY = 'gospel-full-walkthrough-start-slug-v1'

type FullWalkthroughStartSlugPayloadV1 = {
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

function clearFullWalkthroughStartSlug(): void {
  try {
    sessionStorage.removeItem(FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function readFullWalkthroughStartSlug(): string | null {
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
const MAX_RESOURCE_TEMPLATE_BLOCKS = 8
/** Cap category folders that each get one subsection step (lists all templates in the folder). */
const MAX_RESOURCE_CATEGORY_STEPS = 6

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Matches Tailwind `md` (~768px): use popunder + extra offsets so driver.js does not cover the spotlight on phones. */
function isNarrowProfileHelpTourViewport(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(max-width: 767px)').matches
}

function openBookmarksPanelIfClosed(): void {
  if (document.querySelector(BOOKMARKS_PANEL)) return
  document.querySelector<HTMLElement>(BOOKMARKS_TRIGGER)?.click()
}

function closeBookmarksPanelIfOpen(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT))
  document
    .querySelector<HTMLElement>('[data-bookmarks-dropdown-backdrop="true"]')
    ?.click()
  const trigger = document.querySelector<HTMLElement>(BOOKMARKS_TRIGGER)
  if (trigger?.getAttribute('aria-expanded') === 'true') {
    trigger.click()
  }
}

function openHighlightsPanelIfClosed(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(PROFILE_HIGHLIGHTS_PANEL)) return
  document.querySelector<HTMLElement>(PROFILE_HIGHLIGHTS_TRIGGER)?.click()
}

function closeProfileResourceListenDialogIfOpen(): void {
  if (typeof document === 'undefined') return
  if (!document.querySelector(PROFILE_RESOURCE_LISTEN_DIALOG)) return
  document.querySelector<HTMLElement>(MEMORIZE_LISTEN_CLOSE)?.click()
}

function closeProfileSlideoutMenuIfOpen(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT))
  if (document.querySelector(PROFILE_SLIDEOUT_MENU)) {
    document.querySelector<HTMLElement>(PROFILE_MENU_BUTTON)?.click()
  }
}

/**
 * Second subsection block in profile main (e.g. point B after point A) — ids are
 * `section-{sectionKey}-{subsectionIndex}` from `GospelSection`; nested subsections have more segments.
 */
function querySecondPresentationSubsection(): HTMLElement | null {
  const main = document.querySelector('main.container')
  if (!main) return null
  const subsections: HTMLElement[] = []
  for (const el of main.querySelectorAll<HTMLElement>('[id]')) {
    const id = el.id
    if (!id.startsWith('section-')) continue
    if (id.split('-').length !== 3) continue
    subsections.push(el)
  }
  return subsections[1] ?? null
}

/** List items in profile body (`ProfileContent` main), not slide-out menu lists. */
const PRESENTATION_LIST_ITEM_SELECTOR = 'main.container ul li, main.container ol li'

function querySecondPresentationListItem(): HTMLElement | null {
  const items = document.querySelectorAll(PRESENTATION_LIST_ITEM_SELECTOR)
  const el = items[1]
  return el instanceof HTMLElement ? el : null
}

function scrollPresentationSecondListItemIntoView(): void {
  const li = querySecondPresentationListItem()
  if (!li) return
  const offset = getProfileHeaderScrollOffset()
  const top = li.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

/** Prefer second TOC subsection (lettered point B); else second list item in body. */
function scrollBookmarkTourSampleIntoView(): void {
  const subsection = querySecondPresentationSubsection()
  if (subsection?.id) {
    scrollToTocAnchor(subsection.id, {
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
    return
  }
  scrollPresentationSecondListItemIntoView()
}

function queryBookmarkTourScrollTarget(): HTMLElement | null {
  return querySecondPresentationSubsection() ?? querySecondPresentationListItem()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** driver.js normally removes these on destroy; clear defensively so ProfileContent menu hover-close is not stuck after a tour. */
function clearDriverBodyClasses(): void {
  if (typeof document === 'undefined') return
  document.body.classList.remove('driver-active', 'driver-fade', 'driver-simple')
}

/**
 * driver.js sets fixed `top`/`left`/`bottom`/`right` from `innerWidth`/`innerHeight`, which ignore safe areas.
 * Unconditional `margin: env(safe-area-inset-*)` on the popover shifts that box after layout and covers spotlights
 * on notched devices. After driver positions the popover, nudge with `translate` only when its border box
 * intersects the non-usable inset bands.
 */
/**
 * Android Chrome / Capacitor WebView often reports `env(safe-area-inset-bottom)` as 0 while the system
 * nav bar or gesture inset still overlaps the layout viewport. Use a minimum bottom inset so nudges run
 * and popovers stay above those controls (pairs with CSS `max()` on narrow viewports in `globals.css`).
 */
/** Mobile Chrome/WebView when `env(safe-area-inset-bottom)` is often 0; 3-button nav is typically ~48–56dp. */
const PROFILE_HELP_TOUR_ANDROID_FALLBACK_BOTTOM_INSET_PX = 72
/**
 * Capacitor Android reserves bottom space via CSS `margin-bottom` on the popover
 * (see `body.capacitor-android .profile-help-tour-popover.driver-popover` in globals.css).
 * JS keeps a matching bottom inset so the translate backstop catches any popover that still
 * overflows the reserved zone (e.g. unusually tall steps or late-paint OEMs).
 */
const PROFILE_HELP_TOUR_CAPACITOR_ANDROID_BOTTOM_INSET_PX = 96

/**
 * driver.js calls `scrollIntoView` on the popover after `ae()`; smooth scrolling can take hundreds of ms.
 * Nudging before scroll settles fights layout — wait for scroll end / idle / stable frames first.
 */
const PROFILE_HELP_TOUR_SCROLL_SETTLE_IDLE_MS = 120
const PROFILE_HELP_TOUR_SCROLL_SETTLE_MAX_MS = 1200
const PROFILE_HELP_TOUR_SCROLL_STABLE_FRAMES = 3

function scrollMotionSignature(win: Window): string {
  const vv = win.visualViewport
  return [
    win.scrollX,
    win.scrollY,
    vv?.offsetTop ?? 0,
    vv?.offsetLeft ?? 0,
    vv?.scale ?? 1,
  ].join(',')
}

/**
 * Invokes `onSettled` after root / visual viewport scrolling has stopped (`scrollend`, idle debounce,
 * or same motion signature for several rAFs). Always resolves within `PROFILE_HELP_TOUR_SCROLL_SETTLE_MAX_MS`.
 * Returns a cancel function (tour step change / destroy) that does not call `onSettled`.
 */
function waitForScrollSettle(win: Window, onSettled: () => void): () => void {
  let finished = false
  let rafId = 0
  let idleTimer: ReturnType<typeof win.setTimeout> | null = null
  let maxTimer: ReturnType<typeof win.setTimeout> | null = null

  const doc = win.document
  const vv = win.visualViewport

  const cleanup = (): void => {
    if (rafId) {
      win.cancelAnimationFrame(rafId)
      rafId = 0
    }
    if (idleTimer != null) {
      win.clearTimeout(idleTimer)
      idleTimer = null
    }
    if (maxTimer != null) {
      win.clearTimeout(maxTimer)
      maxTimer = null
    }
    win.removeEventListener('scroll', onScrollActivity, true)
    doc.removeEventListener('scrollend', settle)
    win.removeEventListener('scrollend', settle)
    vv?.removeEventListener('scroll', onScrollActivity, true)
    try {
      vv?.removeEventListener('scrollend' as never, settle as EventListener)
    } catch {
      /* VisualViewport scrollend not supported */
    }
  }

  const settle = (): void => {
    if (finished) return
    finished = true
    cleanup()
    onSettled()
  }

  const onScrollActivity = (): void => {
    if (idleTimer != null) win.clearTimeout(idleTimer)
    idleTimer = win.setTimeout(settle, PROFILE_HELP_TOUR_SCROLL_SETTLE_IDLE_MS)
  }

  win.addEventListener('scroll', onScrollActivity, { capture: true, passive: true })
  vv?.addEventListener('scroll', onScrollActivity, { capture: true, passive: true })
  doc.addEventListener('scrollend', settle, { passive: true })
  win.addEventListener('scrollend', settle, { passive: true })
  vv?.addEventListener('scrollend' as never, settle as EventListener, { passive: true })

  let lastSig = scrollMotionSignature(win)
  let stableFrames = 0
  const rafLoop = (): void => {
    if (finished) return
    const sig = scrollMotionSignature(win)
    if (sig === lastSig) {
      stableFrames++
      if (stableFrames >= PROFILE_HELP_TOUR_SCROLL_STABLE_FRAMES) {
        settle()
        return
      }
    } else {
      lastSig = sig
      stableFrames = 0
    }
    rafId = win.requestAnimationFrame(rafLoop)
  }
  rafId = win.requestAnimationFrame(rafLoop)

  maxTimer = win.setTimeout(settle, PROFILE_HELP_TOUR_SCROLL_SETTLE_MAX_MS)

  return () => {
    if (finished) return
    finished = true
    cleanup()
  }
}

/** @internal Exported for unit tests */
export function getProfileHelpTourPopoverSafeInsets(): ReturnType<typeof getSafeAreaInsetsPx> {
  const base = getSafeAreaInsetsPx()
  if (typeof window === 'undefined') return base

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : ''
  const isAndroid = /Android/i.test(ua)
  const narrowForTour =
    typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 767px)').matches
  const nativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'

  if (isAndroid && (narrowForTour || nativeAndroid)) {
    const floor = nativeAndroid
      ? PROFILE_HELP_TOUR_CAPACITOR_ANDROID_BOTTOM_INSET_PX
      : PROFILE_HELP_TOUR_ANDROID_FALLBACK_BOTTOM_INSET_PX
    return {
      ...base,
      bottom: Math.max(base.bottom, floor),
    }
  }
  return base
}

/** One-axis nudge: after `translate(delta)`, need rectLo+delta >= safeLo and rectHi+delta <= safeHi. */
function popoverSafeAxisNudge(rectLo: number, rectHi: number, safeLo: number, safeHi: number): number {
  const deltaMin = safeLo - rectLo
  const deltaMax = safeHi - rectHi
  if (deltaMin > deltaMax) {
    // Wider/taller than the safe span — no delta fits both edges; center the overflow.
    return (deltaMin + deltaMax) / 2
  }
  // Feasible [deltaMin, deltaMax]: pick delta closest to 0 (minimal movement).
  return Math.max(deltaMin, Math.min(deltaMax, 0))
}

/**
 * Adjust driver.js's inline `style.bottom` directly when the popover is bottom-anchored and lands
 * inside the reserved safe zone. Only affects popovers whose *viewport-bottom gap* is smaller than
 * the inset (e.g. popovers near the actual bottom of the screen, or driver.js's `C` overflow
 * fallback with `bottom: 10px`). Popovers placed *below a mid-screen target* keep a large
 * `style.bottom` (e.g. 400px) and are left untouched.
 *
 * Returns true if a bottom-anchor correction was applied (caller skips translate fallback).
 */
function applyBottomAnchorSafeInset(wrapper: HTMLElement, requiredBottomPx: number): boolean {
  const bottomStyle = wrapper.style.bottom
  if (!bottomStyle || bottomStyle === 'auto') return false
  const current = parseFloat(bottomStyle)
  if (!Number.isFinite(current)) return false
  if (current >= requiredBottomPx) return false
  wrapper.style.bottom = `${requiredBottomPx}px`
  return true
}

export function applyProfileHelpTourPopoverSafeAreaNudge(wrapper: HTMLElement): void {
  if (typeof window === 'undefined' || !wrapper.isConnected) return
  const insets = getProfileHelpTourPopoverSafeInsets()
  if (insets.top === 0 && insets.right === 0 && insets.bottom === 0 && insets.left === 0) return

  // Targeted bottom correction: only moves popovers that are actually near the viewport bottom.
  if (insets.bottom > 0 && applyBottomAnchorSafeInset(wrapper, insets.bottom)) {
    return
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  const safeL = insets.left
  const safeT = insets.top
  const safeR = vw - insets.right
  const vv = window.visualViewport
  const visualBottom =
    vv != null && Number.isFinite(vv.offsetTop) && Number.isFinite(vv.height) ? vv.offsetTop + vv.height : vh
  const safeB = Math.min(vh - insets.bottom, visualBottom)

  const driverTransform =
    wrapper.style.transform && wrapper.style.transform !== 'none'
      ? wrapper.style.transform.trim()
      : ''

  const rect = wrapper.getBoundingClientRect()
  const dx = popoverSafeAxisNudge(rect.left, rect.right, safeL, safeR)
  const dy = popoverSafeAxisNudge(rect.top, rect.bottom, safeT, safeB)

  if (dx === 0 && dy === 0) {
    return
  }

  const nudge = `translate(${dx}px, ${dy}px)`
  wrapper.style.transform = driverTransform ? `${driverTransform} ${nudge}` : nudge
}

/** driver.js calls `onPopoverRender` *before* `ae()` (positioning); then `scrollIntoView` can fire `scroll`,
 * and driver re-runs `ae()` from its resize/scroll handler — overwriting our correction. Do not use a
 * MutationObserver on `style` (it races pointer/click delegation). Wait for scroll to settle, then
 * microtask + rAF passes, delayed timers on Capacitor Android, and throttled scroll/resize relayout hooks. */
let profileHelpTourScrollSettleCancel: (() => void) | null = null
let profileHelpTourSafeAreaRelayoutDetach: (() => void) | null = null

function detachProfileHelpTourPopoverSafeAreaRelayoutListeners(): void {
  profileHelpTourScrollSettleCancel?.()
  profileHelpTourScrollSettleCancel = null
  profileHelpTourSafeAreaRelayoutDetach?.()
  profileHelpTourSafeAreaRelayoutDetach = null
}

function isCapacitorAndroidTourHost(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function scheduleProfileHelpTourPopoverSafeAreaNudge(wrapper: HTMLElement): void {
  detachProfileHelpTourPopoverSafeAreaRelayoutListeners()

  const run = (): void => {
    if (wrapper.isConnected) {
      applyProfileHelpTourPopoverSafeAreaNudge(wrapper)
    }
  }

  const afterScrollSettled = (): void => {
    queueMicrotask(run)
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        run()
        window.requestAnimationFrame(() => {
          run()
          if (isCapacitorAndroidTourHost()) {
            window.requestAnimationFrame(run)
          }
        })
      })
    }

    if (typeof window !== 'undefined' && isCapacitorAndroidTourHost()) {
      window.setTimeout(run, 0)
      window.setTimeout(run, 50)
      window.setTimeout(run, 150)
      window.setTimeout(run, 300)

      let relayoutRaf: number | null = null
      const scheduleRunAfterDriverLayout = (): void => {
        if (relayoutRaf != null) return
        relayoutRaf = window.requestAnimationFrame(() => {
          relayoutRaf = null
          window.requestAnimationFrame(run)
        })
      }

      const vv = window.visualViewport
      vv?.addEventListener('resize', scheduleRunAfterDriverLayout)
      vv?.addEventListener('scroll', scheduleRunAfterDriverLayout)
      window.addEventListener('resize', scheduleRunAfterDriverLayout)
      window.addEventListener('scroll', scheduleRunAfterDriverLayout, true)

      profileHelpTourSafeAreaRelayoutDetach = () => {
        if (relayoutRaf != null) {
          window.cancelAnimationFrame(relayoutRaf)
          relayoutRaf = null
        }
        vv?.removeEventListener('resize', scheduleRunAfterDriverLayout)
        vv?.removeEventListener('scroll', scheduleRunAfterDriverLayout)
        window.removeEventListener('resize', scheduleRunAfterDriverLayout)
        window.removeEventListener('scroll', scheduleRunAfterDriverLayout, true)
      }
    }
  }

  if (typeof window === 'undefined') {
    afterScrollSettled()
    return
  }
  profileHelpTourScrollSettleCancel = waitForScrollSettle(window, afterScrollSettled)
}

/** Wraps driver.js so tutorial popovers get conditional safe-area correction after layout and after `refresh()`. */
function createProfileHelpDriver(config: Config): Driver {
  const userOnPopoverRender = config.onPopoverRender
  const merged: Config = {
    ...config,
    onPopoverRender: (popover, opts) => {
      userOnPopoverRender?.(popover, opts)
      scheduleProfileHelpTourPopoverSafeAreaNudge(popover.wrapper)
    },
  }
  const d = driver(merged)
  const innerRefresh = typeof d.refresh === 'function' ? d.refresh.bind(d) : () => {}
  d.refresh = () => {
    innerRefresh()
    const el = document.getElementById('driver-popover-content')
    if (el instanceof HTMLElement) {
      scheduleProfileHelpTourPopoverSafeAreaNudge(el)
    }
  }
  const innerDestroy = typeof d.destroy === 'function' ? d.destroy.bind(d) : () => {}
  d.destroy = () => {
    detachProfileHelpTourPopoverSafeAreaRelayoutListeners()
    innerDestroy()
  }
  return d
}

async function waitUntil(
  predicate: () => boolean,
  timeoutMs: number,
  intervalMs = 80
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true
    await sleep(intervalMs)
  }
  return false
}

function openProfileMenuIfClosed(): void {
  if (document.querySelector(PROFILE_SLIDEOUT_MENU)) return
  document.querySelector<HTMLElement>(PROFILE_MENU_BUTTON)?.click()
}

function openMemorizePanelIfCollapsed(): void {
  if (document.querySelector(MEMORIZE_PANEL)) return
  document.querySelector<HTMLElement>(TOC_MEMORIZE_TOGGLE)?.click()
}

/** After closing the practice modal, restore Menu → Memorize for the remove step. */
async function reopenMemorizeMenuAndPanelForTour(): Promise<void> {
  openProfileMenuIfClosed()
  await waitUntil(() => document.querySelector(PROFILE_SLIDEOUT_MENU) != null, 4000)
  await sleep(200)
  openMemorizePanelIfCollapsed()
  await waitUntil(() => document.querySelector(MEMORIZE_PANEL) != null, 4000)
  await sleep(120)
}

const SCRIPTURE_MODAL_COMPARE_LISTBOX =
  '[data-tour="scripture-modal-compare-listbox"], [role="listbox"][aria-label="Compare with a translation"]'

function resolveCompareToolbarListbox(trigger: HTMLElement): HTMLElement | null {
  const wrap = trigger.parentElement
  if (wrap) {
    const local = wrap.querySelector<HTMLElement>('[role="listbox"]')
    if (local) return local
  }
  return document.querySelector<HTMLElement>(SCRIPTURE_MODAL_COMPARE_LISTBOX)
}

/** Whether the Compare toolbar control's listbox is actually mounted with options — not `aria-expanded` (driver.js overwrites it on the spotlight). */
function compareToolbarDropdownIsOpen(trigger: HTMLElement): boolean {
  const listbox = resolveCompareToolbarListbox(trigger)
  return !!listbox?.querySelector('button[role="option"]')
}

/**
 * Opens the Compare menu unless its listbox is already showing (real DOM, not `aria-expanded`).
 * While a step spotlights this button, driver.js sets `aria-expanded="true"` and **`aria-haspopup="dialog"`**,
 * overwriting React's `listbox` — so we must not gate on `aria-haspopup === "listbox"`.
 */
async function ensureCompareToolbarDropdownOpen(trigger: HTMLButtonElement): Promise<boolean> {
  if (trigger.disabled) return false
  for (let i = 0; i < 4; i++) {
    if (compareToolbarDropdownIsOpen(trigger)) return true
    trigger.click()
    await sleep(i === 0 ? 80 : 100)
  }
  return compareToolbarDropdownIsOpen(trigger)
}

async function selectFirstCompareTranslationOptionAsync(): Promise<boolean> {
  const trigger = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_COMPARE)
  if (!trigger || trigger.disabled) {
    return false
  }
  await ensureCompareToolbarDropdownOpen(trigger)
  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(attempt === 0 ? 0 : 50)
    const listbox = resolveCompareToolbarListbox(trigger)
    if (!listbox) continue
    for (const opt of listbox.querySelectorAll<HTMLButtonElement>('button[role="option"]')) {
      const label = opt.textContent?.trim() ?? ''
      if (label === '' || label === 'Compare') continue
      opt.click()
      return true
    }
  }
  return false
}

async function clearCompareTranslationSelectAsync(): Promise<void> {
  const trigger = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_COMPARE)
  if (!trigger || trigger.disabled) {
    return
  }
  await ensureCompareToolbarDropdownOpen(trigger)
  for (let attempt = 0; attempt < 40; attempt++) {
    await sleep(attempt === 0 ? 0 : 50)
    const listbox = resolveCompareToolbarListbox(trigger)
    const first = listbox?.querySelector<HTMLButtonElement>('button[role="option"]')
    if (first) {
      first.click()
      return
    }
  }
}

function modalVerseBodyHasText(): boolean {
  const el = document.querySelector(SCRIPTURE_MODAL_VERSE_BODY)
  if (!el) return false
  const t = (el.textContent ?? '').replace(/\s/g, '')
  return t.length > 20
}

function getScriptureModalReferenceFromDom(): string | null {
  const h3 = document.querySelector(`${SCRIPTURE_MODAL_TOOLBAR} h3`) as HTMLElement | null
  return h3?.getAttribute('aria-label') ?? h3?.textContent?.trim() ?? null
}

/** After adding (or when the verse was already saved), pick the verse row id for the memorization tour remove step. */
function resolveMemorizeTourTargetVerseIdAfterAdd(): string | null {
  const verses = loadMemorizedVerses()
  if (verses.length === 0) return null
  const ref = getScriptureModalReferenceFromDom()
  if (ref) {
    const normalized = ref.trim()
    const match = verses.find((v) => v.reference.trim() === normalized)
    if (match) return match.id
  }
  return verses.reduce((a, b) => (a.dateAdded >= b.dateAdded ? a : b)).id
}

function compareColumnsVisible(): boolean {
  return !!document.querySelector(SCRIPTURE_MODAL_COMPARE_COLUMNS)
}

function modalSingleVerseViewReady(): boolean {
  return modalVerseBodyHasText() && !document.querySelector(SCRIPTURE_MODAL_CHAPTER_BODY)
}

function wordStudyToolbarButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_WORD_STUDY)
}

function wordStudyOverlayOpen(): boolean {
  return !!document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_OVERLAY)
}

function firstWordStudyChipButton(): HTMLButtonElement | null {
  const panel = document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL)
  return panel?.querySelector<HTMLButtonElement>('ul button[type="button"]') ?? null
}

function wordStudyLexiconHasEntryBody(): boolean {
  const sheet = document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_LEXICON)
  if (!sheet) return false
  return (
    !!sheet.querySelector('[class*="space-y-2"]') &&
    (sheet.textContent?.includes('Lemma') === true ||
      sheet.textContent?.includes('Gloss') === true ||
      sheet.textContent?.includes('Definition') === true)
  )
}

/** Word study is disabled in chapter view; return to single-verse view when needed. */
function ensureModalVerseViewForWordStudy(): Promise<void> {
  if (modalSingleVerseViewReady()) return Promise.resolve()
  const toggle = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE)
  if (toggle?.textContent?.trim() === 'Verse') {
    toggle.click()
    return waitUntil(() => modalSingleVerseViewReady(), 12000).then(() => undefined)
  }
  return Promise.resolve()
}

function openWordStudyOverlayForTour(): Promise<void> {
  return ensureModalVerseViewForWordStudy().then(() => {
    const btn = wordStudyToolbarButton()
    if (btn && !btn.disabled && !wordStudyOverlayOpen()) {
      btn.click()
    }
    return waitUntil(() => wordStudyOverlayOpen() && !!firstWordStudyChipButton(), 15000).then(
      () => undefined
    )
  })
}

/** Escape minimal HTML for safe use inside driver popover title/description (innerHTML). */
function escapeForPopoverText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function resourcesListPanelReady(panel: Element): boolean {
  if (panel.getAttribute('data-resources-loaded') !== 'true') return false
  const t = panel.textContent ?? ''
  if (t.includes('No resources available')) return true
  if (panel.querySelector(RESOURCE_CATEGORY)) return true
  if (panel.querySelector('[data-resource-spurgeon-library]')) return true
  if (panel.querySelector('[data-resource-calvin-library]')) return true
  if (panel.querySelector('a[href^="/"]')) return true
  return false
}

async function fetchPublicResourceItemsForTour(): Promise<PublicResourceItem[]> {
  try {
    const res = await fetch('/api/profiles/public-templates')
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (!data || typeof data !== 'object' || !('items' in data)) return []
    const { items } = data as { items: unknown }
    if (!Array.isArray(items)) return []
    return items as PublicResourceItem[]
  } catch {
    return []
  }
}

function resourcesListOverviewCopy(items: PublicResourceItem[]): string {
  const bibleReaderTitle = resolveBibleReaderMenuTitle(items)
  const menuItems = publicResourceItemsForResourcesMenu(items)
  const hasFolderLike = menuItems.some(
    (i) =>
      i.type === 'category' ||
      i.type === 'spurgeonLibrary' ||
      i.type === 'morningEveningLibrary' ||
      i.type === 'calvinLibrary' ||
      i.type === 'henryLibrary' ||
      i.type === 'edwardsLibrary'
  )
  const bibleReaderNote = bibleReaderTitle
    ? ` <strong>${escapeForPopoverText(bibleReaderTitle)}</strong> is its own button directly under <strong>Resources</strong> in this menu (not inside the list).`
    : ''
  if (menuItems.length === 0 && !bibleReaderTitle) {
    return 'Nothing is listed yet. When your church adds shared profiles or categories in admin, they will appear here.'
  }
  if (!hasFolderLike && menuItems.length > 0) {
    return `The next steps highlight each group of top-level links and explain what those presentations are for—tap a link when you want to open one.${bibleReaderNote}`
  }
  return `The next steps highlight each section: groups of top-level links, library rows (Spurgeon sermons, Morning & Evening, Calvin commentaries, Edwards sermons) when present, and each category folder. Each step lists what is inside and what those resources are for. Folders expand automatically when highlighted—tap any link when you want to open a presentation.${bibleReaderNote}`
}

function resourceTemplatesBlockTitle(count: number): string {
  return count === 1 ? 'Top-level resource' : 'Top-level resources'
}

function resourceTemplatesBlockDescription(
  templates: Extract<PublicResourceItem, { type: 'template' }>[]
): string {
  const titles = templates.map((t) => escapeForPopoverText(t.title.trim() || t.slug))
  const list = titles.map((t) => `<li><strong>${t}</strong></li>`).join('')
  if (templates.length === 1) {
    return `<p>This link sits at the top level (not inside a folder). It opens a shared gospel profile your church published.</p><ul class="list-disc pl-5 mt-2 text-sm">${list}</ul><p class="mt-2">Tap it when you want to open that presentation.</p>`
  }
  return `<p>These links sit at the top level (not inside a folder). Each opens a shared gospel profile your church published.</p><ul class="list-disc pl-5 mt-2 text-sm">${list}</ul><p class="mt-2">Tap any link when you want to open that presentation.</p>`
}

function resourceCategoryBlockDescription(cat: Extract<PublicResourceItem, { type: 'category' }>): string {
  const safeCatName = escapeForPopoverText(cat.name.trim() || 'Category')
  if (cat.children.length === 0) {
    return `<p>This folder (<strong>${safeCatName}</strong>) is for related presentations. None are listed yet—your church can add shared profiles here in admin.</p>`
  }
  const titles = cat.children.map((c) =>
    escapeForPopoverText(c.type === 'template' ? c.title.trim() || c.slug : c.title.trim())
  )
  const list = titles.map((t) => `<li><strong>${t}</strong></li>`).join('')
  return `<p>These items are grouped under <strong>${safeCatName}</strong>—presentations and library shortcuts your church added.</p><ul class="list-disc pl-5 mt-2 text-sm">${list}</ul><p class="mt-2">Tap a link when you want to open one.</p>`
}

/** Safe for use inside `[attr="..."]` selectors. */
function escapeAttrSelectorValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function expandResourceCategoryIfCollapsed(categoryId: string, drv: Pick<Driver, 'refresh'>): void {
  const block = document.querySelector(`[data-resource-category-id="${escapeAttrSelectorValue(categoryId)}"]`)
  if (!block) return
  if (
    block.querySelector('a[data-resource-template-slug]') ||
    block.querySelector('[data-resource-spurgeon-library]') ||
    block.querySelector('[data-resource-morneve-library]') ||
    block.querySelector('[data-resource-calvin-library]')
  ) {
    return
  }
  const btn = block.querySelector<HTMLElement>('[data-tour="resource-category"]')
  btn?.click()
  window.setTimeout(() => drv.refresh(), 280)
}

function tourMotionConfig(): Pick<Config, 'animate' | 'smoothScroll'> {
  const reduce = prefersReducedMotion()
  return { animate: !reduce, smoothScroll: !reduce }
}

/** Optional hooks for chaining (full walkthrough) or tests */
export type ProfileFeatureTourOptions = {
  /**
   * Called after this tour's driver instance is destroyed (Done on the last step, scripted destroy, etc.).
   */
  onComplete?: () => void
  /**
   * When the user cancels a **chained** segment (× on the popover) before finishing, this runs instead of
   * `onComplete` so cleanup happens without starting the next segment (e.g. close bookmarks panel, restore theme).
   */
  onAborted?: () => void
  /**
   * When true (full walkthrough), overlay taps do not dismiss the tour; the popover **×** still cancels.
   * Escape is disabled only while `onComplete` is set (mid-chain), so accidental key presses do not skip ahead.
   */
  captive?: boolean
  /**
   * Full walkthrough only: prepends a centered popover step that names the upcoming tutorial before its first spotlight.
   */
  segmentIntro?: {
    title: string
    description: string
  }
}

type ScriptureReaderTourResumePayloadV1 = {
  v: 1
  captiveForTour: boolean
  /** When set, full walkthrough continues at this segment index after the scripture tour ends. */
  continueFullWalkthroughAt?: number
  segmentIntro?: ProfileFeatureTourOptions['segmentIntro']
}

function prependSegmentIntroIfAny(
  options: ProfileFeatureTourOptions | undefined,
  steps: DriveStep[]
): DriveStep[] {
  const intro = options?.segmentIntro
  if (!intro) return steps
  const title = escapeForPopoverText(intro.title)
  const descParagraphs = intro.description
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeForPopoverText(line)}</p>`)
    .join('')
  return [
    {
      element: () => document.body,
      popover: {
        title,
        description: `<p><strong>Full walkthrough</strong> — next tutorial</p>${descParagraphs}<p>Use <strong>Next</strong> to start.</p>`,
        side: 'over',
        align: 'center',
      },
    },
    ...steps,
  ]
}

function baseProfileHelpDriverConfig(options?: ProfileFeatureTourOptions): Omit<Config, 'steps'> {
  const captive = options?.captive === true
  const chainContinues = typeof options?.onComplete === 'function'
  const suppressChainOnUserClose = captive && chainContinues
  const cancelRef = { cancelled: false }

  return {
    ...tourMotionConfig(),
    allowClose: true,
    overlayClickBehavior: captive ? () => {} : 'close',
    allowKeyboardControl: !suppressChainOnUserClose,
    onCloseClick: (_e, _s, { driver: drv }) => {
      if (suppressChainOnUserClose) cancelRef.cancelled = true
      drv.destroy()
    },
    showProgress: true,
    popoverClass: 'profile-help-tour-popover',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    progressText: '{{current}} of {{total}}',
    onDestroyed: () => {
      clearDriverBodyClasses()
      closeProfileSlideoutMenuIfOpen()
      if (cancelRef.cancelled) {
        options?.onAborted?.()
      } else {
        options?.onComplete?.()
      }
      cancelRef.cancelled = false
      window.requestAnimationFrame(() => {
        closeProfileSlideoutMenuIfOpen()
      })
    },
  }
}

/**
 * Spotlight tour: what bookmarks are (icon) → reading position & scroll → open panel → add → show row → remove.
 */
export function runBookmarksFeatureTour(options?: ProfileFeatureTourOptions): void {
  let tourAddedBookmarkId: string | null = null

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        closeBookmarksPanelIfOpen()
        window.requestAnimationFrame(() => {
          closeBookmarksPanelIfOpen()
        })
        options?.onAborted?.()
      },
      onComplete: () => {
        closeBookmarksPanelIfOpen()
        window.requestAnimationFrame(() => {
          closeBookmarksPanelIfOpen()
          options?.onComplete?.()
        })
      },
    }),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: BOOKMARKS_TRIGGER,
        popover: {
          title: 'Bookmarks',
          description:
            'Use this icon to save where you are in this presentation or jump back later. Bookmarks are stored only on this device (your browser). Use <strong>Next</strong> to see how <strong>where you scroll</strong> affects what gets saved.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 160)
          },
        },
      },
      {
        element: () =>
          queryBookmarkTourScrollTarget() ??
          document.querySelector('main.container') ??
          document.body,
        popover: {
          title: 'Reading position',
          description:
            '<strong>Where you scroll</strong> on the page matters: bookmarks save your place inside the current section—not only the section heading—so you can jump back to the same paragraph on long resources. Use <strong>Next</strong> to continue.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            scrollBookmarkTourSampleIntoView()
            const delay = prefersReducedMotion() ? 160 : 720
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, delay)
          },
        },
      },
      {
        element: BOOKMARKS_TRIGGER,
        popover: {
          title: 'Open your bookmarks',
          description:
            'Tap the <strong>bookmark</strong> icon to open the list of saved places. Use <strong>Next</strong> to open the panel for this tour.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            openBookmarksPanelIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 220)
          },
        },
      },
      {
        element: BOOKMARKS_ADD,
        popover: {
          title: 'Add bookmark',
          description:
            'This panel lists your saved places. Use <strong>Add bookmark</strong> to capture this profile and your current reading line—or use <strong>Next</strong> and this tour will add one for you. Open a row to jump there, or another profile. The next steps show your bookmark in the list and how to remove it. If this spot was already saved, you will still see the row and removal steps.',
          side: 'left',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            const before = new Set(loadBookmarks().map((b) => b.id))
            document.querySelector<HTMLElement>(BOOKMARKS_ADD)?.click()
            void waitUntil(() => {
              const added = loadBookmarks().find((b) => !before.has(b.id))
              if (added) {
                tourAddedBookmarkId = added.id
                return true
              }
              return false
            }, 5000).then((ok) => {
              if (!ok) tourAddedBookmarkId = null
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, prefersReducedMotion() ? 80 : 200)
            })
          },
        },
      },
      {
        element: () => {
          if (tourAddedBookmarkId) {
            const row = document.querySelector(
              `${BOOKMARKS_ROW}[data-bookmark-id="${escapeAttrSelectorValue(tourAddedBookmarkId)}"]`
            )
            if (row) return row
          }
          return (
            document.querySelector(BOOKMARKS_ROW) ??
            document.querySelector(BOOKMARKS_PANEL) ??
            document.body
          )
        },
        popover: {
          title: 'Your bookmark',
          description:
            'This row is your saved place for this profile—tap it to jump back to the same reading line. If you already had a bookmark for this spot, it is the same row. Use <strong>Next</strong> to see how to remove it with the trash icon.',
          side: 'left',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 160)
          },
        },
      },
      {
        element: () => {
          if (tourAddedBookmarkId) {
            const forTourBookmark = document.querySelector(
              `${BOOKMARKS_REMOVE}[data-bookmark-id="${escapeAttrSelectorValue(tourAddedBookmarkId)}"]`
            )
            if (forTourBookmark) return forTourBookmark
          }
          return (
            document.querySelector(BOOKMARKS_REMOVE) ??
            document.querySelector(BOOKMARKS_PANEL) ??
            document.body
          )
        },
        popover: {
          title: 'Remove a bookmark',
          description:
            'The trash icon deletes a row after you confirm. Use <strong>Next</strong> to remove the bookmark we just added (the tour confirms the dialog for you). If nothing new was added because this spot was already saved, <strong>Next</strong> simply continues.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            const id = tourAddedBookmarkId
            if (!id) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
            const removeBtn = document.querySelector<HTMLElement>(
              `${BOOKMARKS_REMOVE}[data-bookmark-id="${escapeAttrSelectorValue(id)}"]`
            )
            if (!removeBtn) {
              tourAddedBookmarkId = null
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
            removeBtn.click()
            void waitUntil(() => !!document.querySelector(ALERT_MODAL_CONFIRM), 4000)
              .then((hasModal) => {
                if (hasModal) {
                  document.querySelector<HTMLElement>(ALERT_MODAL_CONFIRM)?.click()
                }
                return waitUntil(() => !loadBookmarks().some((b) => b.id === id), 5000)
              })
              .then(() => {
                tourAddedBookmarkId = null
                window.setTimeout(() => {
                  drv.refresh()
                  drv.moveNext()
                }, prefersReducedMotion() ? 80 : 200)
              })
          },
        },
      },
      {
        element: BOOKMARKS_PANEL,
        popover: {
          title: 'All set',
          description:
            'Add bookmarks anytime from this panel; remove them with the trash icon when you no longer need them. **Done** closes the tour and this menu.',
          side: 'left',
          align: 'start',
          onNextClick: (_element, _step, { driver: drv }) => {
            closeBookmarksPanelIfOpen()
            window.setTimeout(() => {
              closeBookmarksPanelIfOpen()
              drv.destroy()
            }, 0)
          },
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Spotlight tour for light / dark theme (header control).
 */
export function runThemeFeatureTour(options?: ProfileFeatureTourOptions): void {
  const themeSnapshot = readThemePersistenceSnapshot()

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        applyThemePersistenceSnapshot(themeSnapshot)
        options?.onAborted?.()
      },
      onComplete: () => {
        applyThemePersistenceSnapshot(themeSnapshot)
        options?.onComplete?.()
      },
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Light and dark mode',
          description:
            'Tap the <strong>moon</strong> or <strong>sun</strong> icon to switch appearance. Your choice is saved in this browser. Use <strong>Next</strong> to flip the theme once so you can see the other look—we will restore your previous setting when the tour ends.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_element, _step, { driver: drv }) => {
            document.querySelector<HTMLElement>(THEME_TOGGLE)?.click()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          },
        },
      },
      {
        element: THEME_TOGGLE,
        popover: {
          title: 'Switch anytime',
          description:
            'You should see the opposite mode now. Tap this control whenever you want to change it. <strong>Done</strong> restores whatever you had before this tour (a saved light/dark choice, or your device’s automatic setting if you had not picked one yet).',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Listen**: read-aloud for the presentation body. No-op when the control is not rendered (Android Web). */
export function runProfileListenFeatureTour(options?: ProfileFeatureTourOptions): void {
  const finish = (): void => {
    closeProfileResourceListenDialogIfOpen()
    clearDriverBodyClasses()
    options?.onComplete?.()
  }
  const abort = (): void => {
    closeProfileResourceListenDialogIfOpen()
    clearDriverBodyClasses()
    options?.onAborted?.()
  }

  if (!isProfileResourceListenControlAvailable()) {
    finish()
    return
  }
  if (!document.querySelector(PROFILE_RESOURCE_READ_ALOUD)) {
    finish()
    return
  }

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: abort,
      onComplete: finish,
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_RESOURCE_READ_ALOUD,
        popover: {
          title: 'Listen',
          description:
            'Tap <strong>Listen</strong> to open read-aloud for this presentation: choose where to start in the passage list, use <strong>Play</strong> / <strong>Pause</strong>, adjust speed, and optionally use <strong>read-along</strong> (underline on the page while it speaks). After you turn read-along on, pick <strong>Word</strong> to emphasize each word as it is read, or <strong>Line</strong> to highlight a whole line at a time. Use <strong>Next</strong> to open the panel for a closer look.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_e, _s, { driver: drv }) => {
            document.querySelector<HTMLElement>(PROFILE_RESOURCE_READ_ALOUD)?.click()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 120 : 280)
          },
        },
      },
      {
        element: PROFILE_RESOURCE_LISTEN_DIALOG,
        popover: {
          title: 'Read-aloud controls',
          description:
            'Use the list to jump sections, <strong>Play</strong> to hear the current passage, and the speed control to slow down or speed up. The <strong>underline</strong> button turns read-along highlighting on or off; when it is on, tap <strong>Word</strong> or <strong>Line</strong> next to it to choose whether the highlight tracks a single word or spans the full line. When you are done, tap <strong>Close</strong> or finish this tour.',
          side: 'bottom',
          align: 'center',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Highlights**: saved quotes from section content. */
export function runHighlightsFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        closeBookmarksPanelIfOpen()
        options?.onAborted?.()
      },
      onComplete: () => {
        closeBookmarksPanelIfOpen()
        options?.onComplete?.()
      },
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_HIGHLIGHTS_TRIGGER,
        popover: {
          title: 'Highlights',
          description:
            'Tap the marker icon to see passages you have highlighted in gospel content. Select text in a section to save a highlight. Use <strong>Next</strong> to open the list.',
          side: 'bottom',
          align: 'end',
          onNextClick: (_e, _s, { driver: drv }) => {
            openHighlightsPanelIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 120 : 280)
          },
        },
      },
      {
        element: PROFILE_HIGHLIGHTS_PANEL,
        popover: {
          title: 'Your highlights',
          description:
            'Open a row to jump to that quote, search to filter, or remove highlights you no longer need. Tap outside the panel or close when you are finished.',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/** Header **Share this resource**: link or system share sheet. */
export function runShareResourceFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_SHARE_RESOURCE,
        popover: {
          title: 'Share this resource',
          description:
            'Tap <strong>Share</strong> to copy a link to this presentation or use your device’s share sheet when available—handy for sending the same page to someone you are counseling or studying with.',
          side: 'bottom',
          align: 'end',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Text size tour: Menu closed first, then opens Text size in the slide-out (same drawer pattern as Resources).
 */
export function runTextSizeFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the table of contents, where you will find <strong>Text size</strong> and other controls. Use <strong>Next</strong> to open it for this tour.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            openProfileMenuIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 380)
          },
        },
      },
      {
        element: TOC_TEXT_SIZE_TOGGLE,
        popover: {
          title: 'Text size',
          description:
            'Tap <strong>Text size</strong> to show reading size options for gospel presentation pages. Use <strong>Next</strong> to open the list for this tour.',
          side: 'right',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            const t = document.querySelector<HTMLElement>(TOC_TEXT_SIZE_TOGGLE)
            if (!t) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
              return
            }
            if (!document.querySelector(TEXT_SIZE_PANEL)) {
              t.click()
            }
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 220)
          },
        },
      },
      {
        element: TEXT_SIZE_PANEL,
        popover: {
          title: 'Comfortable reading',
          description:
            'Choose <strong>Normal</strong>, <strong>Larger</strong>, or <strong>Largest</strong>. The presentation text scales so sections and scripture stay easier to read. Your choice is saved in this browser and remembered the next time you visit. (Sizing applies on presentation pages, not on admin screens.)',
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Print tour: Menu closed first, then spotlights **Print Version** in the slide-out (web: browser print / PDF; native: system print).
 */
export function runPrintFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the table of contents, where you will find <strong>Print Version</strong> along with Resources, text size, and Bible translation. Use <strong>Next</strong> to open it for this tour.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            openProfileMenuIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 380)
          },
        },
      },
      {
        element: TOC_PRINT_VERSION,
        popover: {
          title: 'Print version',
          description:
            'Tap <strong>Print Version</strong> when you want a paper copy or a PDF. The layout is tuned for letter-sized print: menus and other chrome are hidden so the gospel content reads cleanly. Output uses <strong>dark text on white</strong> even if you use dark mode on screen—better for printers and PDFs. In a browser you get the usual print or save-as-PDF dialog; in the native app, the system print sheet opens. Use <strong>Done</strong> to close this tour before printing if you prefer.',
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

/** Builds popover HTML listing enabled translations (same source as the menu list). Exported for tests. */
export function buildBibleTranslationTourPopoverDescription(
  enabled: ReadonlyArray<{ translation_name: string }>
): string {
  const names = enabled
    .map((o) => o.translation_name.trim())
    .filter((n) => n.length > 0)
  const listSource = names.length > 0 ? names : ['ESV (English Standard Version)']
  const listItems = listSource
    .map((n) => `<li><strong>${escapeForPopoverText(n)}</strong></li>`)
    .join('')
  return (
    '<p>Choose which Bible version opens when you tap a reference. ' +
    '<strong>Translations available</strong> in your menu right now:</p>' +
    `<ul class="list-disc pl-5 mt-2 text-sm">${listItems}</ul>` +
    '<p class="mt-2">The setting applies to scripture modals and quoted passages on presentation pages. ' +
    'Your choice is saved in this browser for the next time you visit.</p>'
  )
}

async function fetchEnabledTranslationsForBibleTour(): Promise<{ translation_name: string }[]> {
  try {
    const res = await fetch('/api/translations/enabled')
    if (!res.ok) {
      return [{ translation_name: 'ESV (English Standard Version)' }]
    }
    const data: unknown = await res.json()
    const raw = data as { translations?: unknown } | null | undefined
    const list = raw?.translations
    if (!Array.isArray(list) || list.length === 0) {
      return [{ translation_name: 'ESV (English Standard Version)' }]
    }
    return list.map((t: { translation_name?: string; translation_code?: string }) => ({
      translation_name:
        typeof t.translation_name === 'string' && t.translation_name.trim() !== ''
          ? t.translation_name.trim()
          : String(t.translation_code ?? '').toUpperCase(),
    }))
  } catch {
    return [{ translation_name: 'ESV (English Standard Version)' }]
  }
}

/**
 * Bible translation tour: Menu → **Bible Translation** button (step 2) → opens list on Next → panel (step 3), same pattern as Text size.
 * Prefetches `/api/translations/enabled` so the popover lists the same translations as the menu.
 */
export function runBibleTranslationFeatureTour(options?: ProfileFeatureTourOptions): void {
  void runBibleTranslationFeatureTourAsync(options)
}

async function runBibleTranslationFeatureTourAsync(options?: ProfileFeatureTourOptions): Promise<void> {
  const enabled = await fetchEnabledTranslationsForBibleTour()
  const descriptionHtml = buildBibleTranslationTourPopoverDescription(enabled)

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the table of contents, where you will find <strong>Bible Translation</strong> (under <strong>Print Version</strong>) and other controls. Use <strong>Next</strong> to open the menu for this tour.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            openProfileMenuIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 380)
          },
        },
      },
      {
        element: TOC_BIBLE_TRANSLATION_TOGGLE,
        popover: {
          title: 'Bible translation',
          description:
            'Tap <strong>Bible Translation</strong> to show the versions available for scripture (same pattern as <strong>Text size</strong>). Use <strong>Next</strong> to open the list for this tour.',
          side: 'right',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            const t = document.querySelector<HTMLElement>(TOC_BIBLE_TRANSLATION_TOGGLE)
            if (!t) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
              return
            }
            if (!document.querySelector(BIBLE_TRANSLATION_PANEL)) {
              t.click()
            }
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 220)
          },
        },
      },
      {
        element: BIBLE_TRANSLATION_PANEL,
        popover: {
          title: 'Bible translation',
          description: descriptionHtml,
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Verse memorization tour: opens a scripture **card**, saves with **Memorize** in the reader, opens **Menu** → **Memorize**,
 * highlights **+ Add** (picker without the reader), explains the list, opens practice from the **verse row** for a short preview (intro + round 1),
 * walks **Choose practice mode** with separate spotlights for **Type**, **Initials**, **Word**, and **Reorder**, then continues in **Type mode** for **Listen** and the read-aloud modal (play/pause, repeat, speed, close) when the control is shown, then continues with guided typing and closes, then removes the tour verse with the **trash** control (with confirm).
 *
 * When not on `/default`, stores resume state and navigates there first (`ProfilePageClient` calls `tryStartMemorizeTourAfterNavigation`).
 */
export function runMemorizeFeatureTour(options?: ProfileFeatureTourOptions): void {
  if (typeof window === 'undefined') return
  if (!isDefaultProfilePath(window.location.pathname)) {
    const payload: ScriptureReaderTourResumePayloadV1 = {
      v: 1,
      captiveForTour: options?.captive === true,
      continueFullWalkthroughAt:
        options?.captive === true ? getFullWalkthroughIndexAfterMemorize() : undefined,
      segmentIntro: options?.segmentIntro,
    }
    try {
      sessionStorage.removeItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.setItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      runMemorizeFeatureTourOnCurrentPage(options)
      return
    }
    scriptureReaderTourNavigation.assign(`/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}`)
    return
  }
  runMemorizeFeatureTourOnCurrentPage(options)
}

/**
 * When **Listen** is not in the DOM (e.g. some Android + non-ESV), skip the read-aloud substeps in one jump.
 */
function skipReadAloudTourIfListenButtonMissing(drv: Driver): boolean {
  if (document.querySelector(MEMORIZE_LISTEN_OPEN) != null) return false
  const i = drv.getActiveIndex()
  if (i === undefined) return true
  drv.moveTo(i + MEMORIZE_READ_ALOUD_TOUR_STEPS)
  return true
}

/** After mode-picker steps, start **Type mode** so the tour can continue with Listen + typing preview. */
function clickMemorizeTourTypeModeAndAdvanceToListenBlock(drv: Driver): void {
  document.querySelector<HTMLElement>(MEMORIZE_PRACTICE_MODE_TYPE)?.click()
  void waitUntil(
    () => !!document.querySelector('[data-testid="memorize-practice-words"]'),
    6000
  ).then(() => {
    window.setTimeout(() => {
      drv.refresh()
      drv.moveNext()
    }, prefersReducedMotion() ? 80 : 200)
  })
}

function runMemorizeFeatureTourOnCurrentPage(options?: ProfileFeatureTourOptions): void {
  let memorizeTourTargetVerseId: string | null = null
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  closeProfileSlideoutMenuIfOpen()
  closeBookmarksPanelIfOpen()

  const steps: DriveStep[] = [
    {
      element: SCRIPTURE_CARD,
      popover: {
        title: 'Open a scripture card',
        description:
          'Blue cards list passages for this section. Tap one to read—or use <strong>Next</strong> to open the first card for this tour.',
        ...pop({ side: 'top', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_CARD)?.click()
          void waitUntil(() => !!document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 12000).then(() => {
            void waitUntil(() => modalVerseBodyHasText(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
            })
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_MEMORIZE,
      popover: {
        title: 'Save for memorization',
        description:
          'Tap <strong>Memorize</strong> in the reader header to save this passage on this device (reference, text, and translation). If it is already saved, the button is disabled and we will skip ahead. Use <strong>Next</strong> to save (or continue).',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const tryAdvance = (): void => {
            memorizeTourTargetVerseId = resolveMemorizeTourTargetVerseIdAfterAdd()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          }
          const btn = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_MEMORIZE)
          if (btn?.disabled) {
            tryAdvance()
            return
          }
          btn?.click()
          void waitUntil(() => !!document.querySelector(ALERT_MODAL_OK), 6000).then((hasOk) => {
            if (hasOk) document.querySelector<HTMLElement>(ALERT_MODAL_OK)?.click()
            tryAdvance()
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_CLOSE,
      popover: {
        title: 'Close the reader',
        description: 'Use <strong>Next</strong> to close the Scripture reader and return to the page.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_CLOSE)?.click()
          void waitUntil(() => !document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 5000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })
        },
      },
    },
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Open the slide-out to find <strong>Memorize</strong> just below <strong>Bible Translation</strong>. Use <strong>Next</strong> to open the menu.',
        side: 'bottom',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 380)
        },
      },
    },
    {
      element: TOC_MEMORIZE_TOGGLE,
      popover: {
        title: 'Memorize',
        description:
          'Tap <strong>Memorize</strong> to show your saved verses. Use <strong>Next</strong> to expand the list for this tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const t = document.querySelector<HTMLElement>(TOC_MEMORIZE_TOGGLE)
          if (!t) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
            return
          }
          if (!document.querySelector(MEMORIZE_PANEL)) {
            t.click()
          }
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 220)
        },
      },
    },
    {
      element: MEMORIZE_PANEL,
      popover: {
        title: 'Your memorization list',
        description:
          'Verses are grouped by progress—<strong>Learning</strong>, <strong>Practicing</strong>, and <strong>Mastered</strong>. Tap the <strong>left side of a row</strong> (reference and details) to open guided practice—five rounds with blanks for each word (and digits in the reference). The <strong>trash</strong> icon on the right removes a verse after you confirm. Use <strong>Next</strong> to open practice for the verse we added and preview how it works.',
        ...pop({ side: 'right', align: 'start' }),
      },
    },
    {
      element: () => {
        const id = memorizeTourTargetVerseId
        if (!id) return document.querySelector(MEMORIZE_PANEL) ?? document.body
        const practiceBtn = document.querySelector<HTMLElement>(
          `button[data-memorize-verse-practice="${escapeAttrSelectorValue(id)}"]`
        )
        if (practiceBtn) {
          // Spotlight the full row (left tap target + remove control), not just the text button; matches the “row” copy.
          return practiceBtn.closest<HTMLElement>('[role="listitem"]') ?? practiceBtn
        }
        return document.querySelector(MEMORIZE_PANEL) ?? document.body
      },
      popover: {
        title: 'Open practice from the list',
        description:
          'Use <strong>Next</strong> to open the practice session for the verse we added (same as tapping that verse’s <strong>row on the left</strong>).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const id = memorizeTourTargetVerseId
          if (!id) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          const practiceBtn = document.querySelector<HTMLElement>(
            `button[data-memorize-verse-practice="${escapeAttrSelectorValue(id)}"]`
          )
          if (!practiceBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          practiceBtn.click()
          void waitUntil(() => !!document.querySelector(MEMORIZE_PRACTICE_DIALOG), 8000).then((opened) => {
            if (!opened) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.querySelector(MEMORIZE_PANEL) ??
        document.body,
      popover: {
        title: 'Before you practice',
        description:
          'You see the full verse and reference first. The <strong>Round</strong> dropdown in the footer sets which of the five rounds you begin on (round 1 is easiest). When you are ready, <strong>Start practice</strong> opens <strong>Choose practice mode</strong>. Use <strong>Next</strong> to open that dialog for the tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const start = document.querySelector<HTMLElement>(MEMORIZE_START_PRACTICE)
          if (start) {
            start.click()
            void waitUntil(() => !!document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER), 4000).then((opened) => {
              if (!opened) {
                window.setTimeout(() => {
                  drv.refresh()
                  drv.moveNext()
                }, 120)
                return
              }
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, prefersReducedMotion() ? 80 : 200)
            })
            return
          }
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_TYPE) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Choose practice mode',
        description:
          'Pick how you want to work through the <strong>same five rounds</strong>: all paths end at round 5—in <strong>Type</strong>, <strong>Initials</strong>, and <strong>Word</strong> mode more words are hidden each round (Initials hides every blank and shows an initials hint line); in <strong>Reorder</strong> mode more phrase chunks are shuffled. Use <strong>Next</strong> to walk <strong>Type</strong> → <strong>Initials</strong> → <strong>Word</strong> → <strong>Reorder</strong>, then the tour continues in <strong>Type mode</strong> for Listen and typing.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_TYPE) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.body,
      popover: {
        title: 'Type mode',
        description:
          '<strong>Type mode</strong> uses the keyboard: type the <strong>first letter</strong> of each blank word and each <strong>digit</strong> in the reference (punctuation stays on screen). Use <strong>Next</strong> to see <strong>Initials mode</strong>.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_INITIALS) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Initials mode',
        description:
          '<strong>Initials mode</strong> still uses the keyboard like Type, but every blank is hidden and a separate <strong>initials hint</strong> line shows the first letter of each word (and digits for the reference) so you can work from cues. Use <strong>Next</strong> to see <strong>Word mode</strong>.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_WORD) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.body,
      popover: {
        title: 'Word mode',
        description:
          '<strong>Word mode</strong> skips the keyboard: tap <strong>word</strong> choices and <strong>digit</strong> buttons in the bottom bar instead. Use <strong>Next</strong> to see <strong>Reorder mode</strong>.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_PRACTICE_MODE_REORDER) ??
        document.querySelector(MEMORIZE_PRACTICE_MODE_PICKER) ??
        document.body,
      popover: {
        title: 'Reorder mode',
        description:
          '<strong>Reorder mode</strong> splits the verse into <strong>draggable chunks</strong> you put back in reading order, with the <strong>reference</strong> as separate pieces (book, chapter number, verse); a colon appears between chapter and verse but is not a chip. Hold <strong>Hint</strong> like other modes to peek at the first section still wrong. Use <strong>Next</strong> to start round 1 in <strong>Type mode</strong> for the rest of the tour (Listen, then blanks).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          clickMemorizeTourTypeModeAndAdvanceToListenBlock(drv)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_OPEN) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Listen',
        description:
          '**Listen** in the session header opens the <strong>Listen</strong> panel. Use it during intro and typing rounds. Use <strong>Next</strong> to open the panel for a quick look (or skip ahead if you do not see **Listen** on this device).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          if (skipReadAloudTourIfListenButtonMissing(drv)) return
          document.querySelector<HTMLElement>(MEMORIZE_LISTEN_OPEN)?.click()
          void waitUntil(() => !!document.querySelector(MEMORIZE_LISTEN_PASSAGE), 5000).then((opened) => {
            window.setTimeout(() => {
              drv.refresh()
              if (opened) {
                drv.moveNext()
              } else {
                const i = drv.getActiveIndex() ?? 0
                drv.moveTo(i + MEMORIZE_READ_ALOUD_TOUR_STEPS)
              }
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_PASSAGE) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Play or Pause',
        description:
          '**Play** (or <strong>Pause</strong> while it is running) the passage. ESV uses streamed audio; other translations use the device reader for your saved line. Use <strong>Next</strong> to continue.',
        ...pop({ side: 'over', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_REPEAT) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Repeat',
        description:
          'Turn <strong>Repeat</strong> on to loop the read-aloud with a short pause between plays; turn it off to stop after the current one. Use <strong>Next</strong> to continue.',
        ...pop({ side: 'over', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_SPEED) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Read aloud: Speed',
        description:
          'Choose <strong>read-aloud speed</strong>; your last choice is remembered. Use <strong>Next</strong> to continue.',
        ...pop({ side: 'over', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, prefersReducedMotion() ? 60 : 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(MEMORIZE_LISTEN_CLOSE) ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.body,
      popover: {
        title: 'Close read aloud',
        description:
          'When you are done, close this panel to return to practice. Use <strong>Next</strong> to close it for the tour and continue.',
        ...pop({ side: 'over', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void (async () => {
            const close = document.querySelector<HTMLElement>(MEMORIZE_LISTEN_CLOSE)
            close?.click()
            await waitUntil(() => !document.querySelector(MEMORIZE_LISTEN_PASSAGE), 5000)
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })()
        },
      },
    },
    {
      element: () =>
        document.querySelector('[data-testid="memorize-practice-words"]') ??
        document.querySelector(MEMORIZE_PRACTICE_DIALOG) ??
        document.querySelector(MEMORIZE_PANEL) ??
        document.body,
      popover: {
        title: 'Guided practice',
        description:
          'Blanks mark what to fill next—in <strong>Type mode</strong>: <strong>first letter</strong> of each word, or each <strong>digit</strong> in the reference. <strong>Word mode</strong> uses <strong>buttons</strong> (from the verse) instead of the keyboard. <strong>Hint</strong> temporarily peeks at hidden words. Use <strong>Next</strong> to close this preview and return to the list.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void (async () => {
            const closeBtn = document.querySelector<HTMLElement>(MEMORIZE_PRACTICE_CLOSE)
            if (closeBtn) {
              closeBtn.click()
              await waitUntil(() => !document.querySelector(MEMORIZE_PRACTICE_DIALOG), 6000)
            }
            await reopenMemorizeMenuAndPanelForTour()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })()
        },
      },
    },
    {
      element: () => {
        const id = memorizeTourTargetVerseId
        if (!id) return document.querySelector(MEMORIZE_PANEL) ?? document.body
        const removeBtn = document.querySelector<HTMLElement>(
          `button[data-memorize-verse-id="${escapeAttrSelectorValue(id)}"]`
        )
        if (removeBtn) {
          // The button cell is a tall strip; the trash glyph is a small icon—spotlight the SVG so the ring matches the delete control.
          return removeBtn.querySelector('svg') ?? removeBtn
        }
        return document.querySelector(MEMORIZE_PANEL) ?? document.body
      },
      popover: {
        title: 'Remove this verse',
        description:
          'Use <strong>Next</strong> to remove the verse we added for this tour via the <strong>trash</strong> icon (the tour confirms the dialog for you).',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const id = memorizeTourTargetVerseId
          if (!id) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          const removeBtn = document.querySelector<HTMLElement>(
            `button[data-memorize-verse-id="${escapeAttrSelectorValue(id)}"]`
          )
          if (!removeBtn) {
            memorizeTourTargetVerseId = null
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          removeBtn.click()
          void waitUntil(() => !!document.querySelector(ALERT_MODAL_CONFIRM), 4000)
            .then((hasModal) => {
              if (hasModal) document.querySelector<HTMLElement>(ALERT_MODAL_CONFIRM)?.click()
              return waitUntil(() => !loadMemorizedVerses().some((v) => v.id === id), 5000)
            })
            .then(() => {
              memorizeTourTargetVerseId = null
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, prefersReducedMotion() ? 80 : 200)
            })
        },
      },
    },
    {
      element: MEMORIZE_PANEL,
      popover: {
        title: 'All set',
        description:
          'You can add verses anytime from the Scripture reader and manage them here. **Done** closes the tour and the menu.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          closeProfileSlideoutMenuIfOpen()
          window.setTimeout(() => {
            closeProfileSlideoutMenuIfOpen()
            drv.destroy()
          }, 0)
        },
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    stagePadding: narrow ? 14 : 10,
    popoverOffset: narrow ? 26 : 10,
    ...(narrow
      ? {
          onHighlighted: (element, _step, { driver: drv }) => {
            if (element instanceof HTMLElement && element !== document.body) {
              element.scrollIntoView({
                block: 'center',
                inline: 'nearest',
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
              })
            }
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 0 : 140)
              })
            })
          },
        }
      : {}),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })

  d.drive()
}

/** Dismiss the Add Memorized Verse picker by sending Escape (its window keydown listener closes on Escape). */
function closeAddMemorizeModalIfOpen(): void {
  if (typeof document === 'undefined') return
  if (!document.querySelector(ADD_MEMORIZE_MODAL)) return
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

/**
 * Add Custom Memorization tour: walks through **Menu** → **Memorize** → **+ Add**, explains the picker’s
 * testaments, auto-picks a book, chapter, and verse, then highlights **Add**. The tour does not submit;
 * closing the modal cleans up without persisting a new memorized verse.
 */
export function runAddCustomMemorizationFeatureTour(options?: ProfileFeatureTourOptions): void {
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  closeProfileSlideoutMenuIfOpen()
  closeBookmarksPanelIfOpen()
  closeAddMemorizeModalIfOpen()

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Tap the <strong>menu icon</strong> (top-left) to open the slide-out. <strong>Memorize</strong> sits just below <strong>Bible Translation</strong>. Use <strong>Next</strong> to open the menu for this tour.',
        side: 'bottom',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 380)
        },
      },
    },
    {
      element: TOC_MEMORIZE_TOGGLE,
      popover: {
        title: 'Memorize',
        description:
          'Tap <strong>Memorize</strong> to show your saved verses and reveal the <strong>+ Add</strong> button for adding new passages. Use <strong>Next</strong> to expand it for this tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          openMemorizePanelIfCollapsed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 220)
        },
      },
    },
    {
      element: MEMORIZE_ADD_VERSE,
      popover: {
        title: '+ Add',
        description:
          'Tap <strong>+ Add</strong> to open a picker for <strong>any</strong> book, chapter, and verse range—without opening the Scripture reader. Text is loaded in your <strong>current Bible translation</strong>. Use <strong>Next</strong> to open the picker for this tour.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLElement>(MEMORIZE_ADD_VERSE)
          if (!btn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          btn.click()
          void waitUntil(() => !!document.querySelector(ADD_MEMORIZE_MODAL), 6000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_TESTAMENTS) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Old or New Testament',
        description:
          'Start by choosing a <strong>testament</strong>. <strong>Old Testament</strong> lists <strong>Genesis → Malachi</strong>; <strong>New Testament</strong> lists <strong>Matthew → Revelation</strong>. The book list below updates to match. Use <strong>Next</strong> to continue with the <strong>Old Testament</strong> for this tour.',
        ...pop({ side: 'bottom', align: 'center' }),
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_BOOK) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Choose a book',
        description:
          'Each row is a <strong>book</strong> of the Bible. Tap one to reveal its <strong>chapters</strong> (long books scroll inside the list). Use <strong>Next</strong> to open <strong>Genesis</strong> for this tour.',
        ...pop({ side: 'right', align: 'start' }, { side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const bookBtn = document.querySelector<HTMLElement>(ADD_MEMORIZE_BOOK)
          if (!bookBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          bookBtn.click()
          void waitUntil(() => !!document.querySelector(ADD_MEMORIZE_CHAPTER), 4000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_CHAPTER) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Choose a chapter',
        description:
          'Each number is a <strong>chapter</strong>. Tap one and the <strong>verses</strong> for that chapter appear below. Use <strong>Next</strong> to pick <strong>chapter 1</strong> for this tour.',
        ...pop({ side: 'right', align: 'start' }, { side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const chapterBtn = document.querySelector<HTMLElement>(ADD_MEMORIZE_CHAPTER)
          if (!chapterBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          chapterBtn.click()
          void waitUntil(() => !!document.querySelector(ADD_MEMORIZE_VERSE), 4000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_VERSE) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Choose a verse',
        description:
          'Tap one verse to pick a <strong>single verse</strong>; tap a <strong>second</strong> verse to set a <strong>range</strong>. Tapping outside the range starts a new selection. Use <strong>Next</strong> to pick <strong>verse 1</strong> for this tour.',
        ...pop({ side: 'right', align: 'start' }, { side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const verseBtn = document.querySelector<HTMLElement>(ADD_MEMORIZE_VERSE)
          if (!verseBtn) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          verseBtn.click()
          void waitUntil(
            () => {
              const addBtn = document.querySelector<HTMLButtonElement>(ADD_MEMORIZE_ADD)
              return !!addBtn && !addBtn.disabled
            },
            2000
          ).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(ADD_MEMORIZE_ADD) ??
        document.querySelector(ADD_MEMORIZE_MODAL) ??
        document.body,
      popover: {
        title: 'Add',
        description:
          'Tap <strong>Add</strong> to save the passage. The app loads the text from your current translation and stores <strong>reference</strong>, <strong>text</strong>, and <strong>translation</strong> on this device. Duplicates (same reference and translation) are rejected. <strong>Done</strong> closes this tour without adding the verse.',
        ...pop({ side: 'top', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          closeAddMemorizeModalIfOpen()
          closeProfileSlideoutMenuIfOpen()
          window.setTimeout(() => {
            drv.destroy()
          }, 0)
        },
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    stagePadding: narrow ? 14 : 10,
    popoverOffset: narrow ? 26 : 10,
    ...(narrow
      ? {
          onHighlighted: (element, _step, { driver: drv }) => {
            if (element instanceof HTMLElement && element !== document.body) {
              element.scrollIntoView({
                block: 'center',
                inline: 'nearest',
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
              })
            }
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 0 : 140)
              })
            })
          },
        }
      : {}),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })

  d.drive()
}

/**
 * Table of contents tour: opens **Menu**, then highlights section/subsection links in the slide-out.
 */
export function runTableOfContentsFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: PROFILE_MENU_BUTTON,
        popover: {
          title: 'Menu',
          description:
            'Tap the <strong>menu icon</strong> (top-left) to open the slide-out. At the top you will find <strong>Resources</strong>, <strong>Text size</strong>, <strong>Print</strong>, and <strong>Bible translation</strong>, with <strong>Memorize</strong> just below <strong>Bible translation</strong>. Below that is the <strong>table of contents</strong>—links that match each section of this presentation. Use <strong>Next</strong> to open the menu for this tour.',
          side: 'bottom',
          align: 'start',
          onNextClick: (_e, _s, { driver: drv }) => {
            openProfileMenuIfClosed()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 380)
          },
        },
      },
      {
        element: () =>
          document.querySelector(TOC_SECTION_LINKS) ??
          document.querySelector(PROFILE_SLIDEOUT_MENU) ??
          document.body,
        popover: {
          title: 'Navigate this presentation',
          description:
            'These blue links list every main section and subsection. Tap one to <strong>jump</strong> to that part of the page without leaving this profile. On a long presentation, scroll inside the menu to see them all. Matching anchors are also used when you <strong>bookmark</strong> your place.',
          side: 'right',
          align: 'start',
        },
      },
    ]),
  })

  d.drive()
}

/** Same as `ScriptureHoverModal`: native app or primary input has no hover. */
function isTouchOnlyScripturePreview(): boolean {
  if (typeof window === 'undefined') return false
  if (Capacitor.isNativePlatform()) return true
  return typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches
}

/** Verse text aligned with common English Bibles (e.g. ESV) for the default profile’s first scripture card. */
const SCRIPTURE_HOVER_PREVIEW_DEMO_REFERENCE = 'Deuteronomy 4:35'
const SCRIPTURE_HOVER_PREVIEW_DEMO_VERSE_TEXT =
  'To you it was shown, that you might know that the Lord is God; there is no other besides him.'

function profileHelpRefreshDriverConfig(drv: Driver, patch: Partial<Config>): void {
  drv.setConfig({ ...drv.getConfig(), ...patch })
  window.requestAnimationFrame(() => drv.refresh())
}

/**
 * Same silhouette browsers use for `cursor: pointer` on links (hand with index finger): Bootstrap Icons `hand-index-fill` (MIT).
 * https://github.com/twbs/icons — finger points **up**; motion brings the hand down toward the chip (`globals.css`).
 */
function scriptureHoverPreviewDemoLinkPointerSvg(): string {
  return (
    '<svg class="shvp-demo-pointer-svg" width="30" height="30" viewBox="0 0 16 16" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">' +
    '<path fill="#ffffff" stroke="rgb(15 23 42)" stroke-width="0.4" stroke-linejoin="round" d="M8.5 4.466V1.75a1.75 1.75 0 1 0-3.5 0v5.34l-1.2.24a1.5 1.5 0 0 0-1.196 1.636l.345 3.106a2.5 2.5 0 0 0 .405 1.11l1.433 2.15A1.5 1.5 0 0 0 6.035 16h6.385a1.5 1.5 0 0 0 1.302-.756l1.395-2.441a3.5 3.5 0 0 0 .444-1.389l.271-2.715a2 2 0 0 0-1.99-2.199h-.581a5 5 0 0 0-.195-.248c-.191-.229-.51-.568-.88-.716-.364-.146-.846-.132-1.158-.108l-.132.012a1.26 1.26 0 0 0-.56-.642 2.6 2.6 0 0 0-.738-.288c-.31-.062-.739-.058-1.05-.046z"/>' +
    '</svg>'
  )
}

/**
 * Static HTML: animated demo—**fingertip** to chip **center**; preview **overlaps** chip top like `ScriptureHoverModal` (timing in CSS). No API.
 */
function scriptureHoverPreviewDemoVisualsHtml(useTouchPointer: boolean): string {
  const ref = escapeForPopoverText(SCRIPTURE_HOVER_PREVIEW_DEMO_REFERENCE)
  const verse = escapeForPopoverText(SCRIPTURE_HOVER_PREVIEW_DEMO_VERSE_TEXT)
  const touchClass = useTouchPointer ? ' shvp-demo-pointer--touch' : ''
  const pointerSvg = scriptureHoverPreviewDemoLinkPointerSvg()
  return (
    '<div class="scripture-hover-preview-tour-demo" role="presentation">' +
    '<div class="shvp-demo-stage mt-3">' +
    '<div class="shvp-demo-popup-wrap">' +
    '<div class="shvp-demo-popup-card relative text-left rounded-lg p-6 min-h-[60px]">' +
    '<div class="shvp-demo-popup-text">' +
    `<div class="font-medium mb-2 text-base md:text-lg">${ref}</div>` +
    `<div class="text-base md:text-lg leading-relaxed">${verse}</div>` +
    '</div>' +
    '<div class="shvp-demo-popup-arrow" aria-hidden="true"></div>' +
    '</div></div>' +
    `<div class="shvp-demo-button-wrap"><span class="shvp-demo-fake-btn inline-flex items-center justify-center gap-1.5 px-4 py-2 text-base md:text-lg rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 min-h-[44px] font-normal">${ref}</span></div>` +
    `<div class="shvp-demo-pointer${touchClass}" aria-hidden="true">${pointerSvg}</div>` +
    '</div></div>'
  )
}

function scriptureHoverPreviewTourIntroDescription(): string {
  const how =
    '<p><strong>Desktop:</strong> with a mouse, <strong>hover</strong> over a scripture reference in the paragraph text (the pill-style link) for a couple of seconds. <strong>Phone or native app:</strong> <strong>press and hold</strong> for about half a second—touchscreens have no hover. Either way, a small card appears with verse text without opening the full reader.</p>'
  return `${how}${scriptureHoverPreviewDemoVisualsHtml(isTouchOnlyScripturePreview())}`
}

/**
 * Short tour: explains inline scripture **preview** (hover or long-press) and shows an **animated link-pointer-hand** demo
 * in the popover (CSS in `globals.css`).
 */
export function runScriptureHoverPreviewFeatureTour(options?: ProfileFeatureTourOptions): void {
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, [
      {
        element: () => document.body,
        onHighlightStarted: (_el, _step, { driver: drv }) => {
          profileHelpRefreshDriverConfig(drv, { stagePadding: 10, popoverOffset: 10 })
        },
        popover: {
          title: 'Quick verse preview',
          description: scriptureHoverPreviewTourIntroDescription(),
          side: 'over',
          align: 'center',
        },
      },
    ]),
  })

  d.drive()
}

/**
 * Greek / Hebrew word study tour: opens a scripture card, toggles **Greek** or **Hebrew** in the reader toolbar,
 * walks word chips (STEP Bible), and the lexicon bottom sheet (TBESG / TBESH).
 *
 * When not on `/default`, stores resume state and navigates there first (`tryStartWordStudyTourAfterNavigation`).
 */
export function runWordStudyFeatureTour(options?: ProfileFeatureTourOptions): void {
  if (typeof window === 'undefined') return
  if (!isDefaultProfilePath(window.location.pathname)) {
    const payload: ScriptureReaderTourResumePayloadV1 = {
      v: 1,
      captiveForTour: options?.captive === true,
      continueFullWalkthroughAt:
        options?.captive === true ? getFullWalkthroughIndexAfterWordStudy() : undefined,
      segmentIntro: options?.segmentIntro,
    }
    try {
      sessionStorage.removeItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.removeItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.setItem(WORD_STUDY_TOUR_RESUME_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      runWordStudyFeatureTourOnCurrentPage(options)
      return
    }
    scriptureReaderTourNavigation.assign(`/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}`)
    return
  }
  runWordStudyFeatureTourOnCurrentPage(options)
}

function runWordStudyFeatureTourOnCurrentPage(options?: ProfileFeatureTourOptions): void {
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  const steps: DriveStep[] = [
    {
      element: SCRIPTURE_CARD,
      popover: {
        title: 'Open a scripture card',
        description:
          'Blue cards open the full reader. Word study needs a <strong>verse</strong> reference (not a whole chapter alone). Use <strong>Next</strong> to open the first card for this tour.',
        ...pop({ side: 'top', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_CARD)?.click()
          void waitUntil(() => !!document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 12000).then(() => {
            void waitUntil(() => modalSingleVerseViewReady(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
            })
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_WORD_STUDY,
      popover: {
        title: 'Greek or Hebrew',
        description:
          'In the reader toolbar, this button is labeled <strong>Greek</strong> (New Testament), <strong>Hebrew</strong> (most Old Testament), or <strong>Aramaic</strong> (e.g. Daniel 2:4–7:28). It only works in <strong>verse</strong> view—if you see the full <strong>Chapter</strong>, tap <strong>Verse</strong> on the toggle first. Data comes from STEP Bible (CC BY 4.0), not from your English translation. Use <strong>Next</strong> to open word study.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void openWordStudyOverlayForTour().then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 300)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL) ??
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_OVERLAY)!,
      popover: {
        title: 'Word study overlay',
        description:
          'This card sits over the English passage with original-language <strong>tokens</strong> for the verse (often fewer chips than English words when STEP merges prefixes and suffixes). The toolbar button stays highlighted while word study is open.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL) ??
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_OVERLAY)!,
      popover: {
        title: 'Word chips',
        description:
          'Each chip shows the <strong>form in the text</strong> (large Hebrew or Greek), <strong>transliteration</strong>, a short <strong>English gloss</strong>, and a <strong>Strong’s</strong> code (e.g. H3644G). These follow the verse, not the ESV/KJV wording.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: () => firstWordStudyChipButton() ?? document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL)!,
      popover: {
        title: 'Tap a word',
        description:
          'Tap any chip to open the <strong>lexicon</strong> sheet at the bottom. Use <strong>Next</strong> to select the first word for this tour.',
        ...pop({ side: 'top', align: 'center' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          firstWordStudyChipButton()?.click()
          void waitUntil(() => wordStudyLexiconHasEntryBody(), 12000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_LEXICON) ??
        document.querySelector(SCRIPTURE_MODAL_WORD_STUDY_PANEL)!,
      popover: {
        title: 'Lexicon sheet',
        description:
          '<p>The bottom sheet shows the <strong>dictionary lemma</strong> (root form), transliteration, gloss, and definition from TBESH (Hebrew) or TBESG (Greek). The <strong>lemma</strong> may differ from the large text on the chip—that chip is the <strong>inflected form in this verse</strong> (prefixes, suffixes, and maqqef).</p>' +
          '<p class="mt-2">Greek entries can switch <strong>Brief</strong> and <strong>Full</strong> (TFLSJ when available). Hebrew uses brief TBESH only. Tap <strong>×</strong> on the sheet or the same toolbar button to close.</p>',
        ...pop({ side: 'top', align: 'center' }, { side: 'top', align: 'center' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_WORD_STUDY,
      popover: {
        title: 'You are set',
        description:
          'Use <strong>Greek</strong> or <strong>Hebrew</strong> anytime you are reading a single verse. For compare mode, word study still works over the passage.',
        ...pop({ side: 'bottom', align: 'start' }),
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    steps: prependSegmentIntroIfAny(options, steps),
  })
  d.drive()
}

/**
 * Scripture modal tour: opens the first scripture **card** on the page, then walks compare, verse/chapter toggle
 * (chapter view then back to the passage), next/prev arrows, optional **Pin** color (saved on close), close, pinned card,
 * per-color unpin on the card (explained only—no tap), **Menu** pinned-passage summary, and **Clear pinned passages**.
 *
 * When the reader is not already on the public **default** presentation (`/default`), this stores resume state and
 * navigates there first (`ProfilePageClient` calls `tryStartScriptureReaderTourAfterNavigation`).
 */
export function runScriptureModalFeatureTour(options?: ProfileFeatureTourOptions): void {
  if (typeof window === 'undefined') return
  if (!isDefaultProfilePath(window.location.pathname)) {
    const payload: ScriptureReaderTourResumePayloadV1 = {
      v: 1,
      captiveForTour: options?.captive === true,
      continueFullWalkthroughAt:
        options?.captive === true ? getFullWalkthroughIndexAfterScriptureReader() : undefined,
      segmentIntro: options?.segmentIntro,
    }
    try {
      sessionStorage.removeItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
      sessionStorage.setItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      runScriptureModalFeatureTourOnCurrentPage(options)
      return
    }
    scriptureReaderTourNavigation.assign(`/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}`)
    return
  }
  runScriptureModalFeatureTourOnCurrentPage(options)
}

function runScriptureModalFeatureTourOnCurrentPage(options?: ProfileFeatureTourOptions): void {
  const narrow = isNarrowProfileHelpTourViewport()
  const pop = (
    wide: { side: Side; align: Alignment },
    narrowOverride?: { side: Side; align: Alignment }
  ): { side: Side; align: Alignment } =>
    narrow ? (narrowOverride ?? { side: 'bottom', align: 'center' }) : wide

  const steps: DriveStep[] = [
    {
      element: SCRIPTURE_CARD,
      popover: {
        title: 'Open a scripture card',
        description:
          'Blue cards list passages for this section. Tap one to read it in full—or use <strong>Next</strong> to open the first card for this tour.',
        ...pop({ side: 'top', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_CARD)?.click()
          void waitUntil(() => !!document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 12000).then(() => {
            void waitUntil(() => modalVerseBodyHasText(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
            })
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_VERSE_BODY) ?? document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
      popover: {
        title: 'The passage',
        description:
          'The verse or range appears here in the translation you chose in the menu (or the site default). Use the toolbar above to compare, switch between verse-only and full-chapter views, or move to another passage.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_COMPARE,
      popover: {
        title: 'Compare translations',
        description:
          'Open <strong>Compare</strong> and pick a second version to read the same passage beside your main translation (only translations your church enables appear; the list never repeats the one you are already reading). Tap <strong>Next</strong> to open <strong>Compare</strong> and choose a second translation for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void (async () => {
            const applied = await selectFirstCompareTranslationOptionAsync()
            if (!applied) {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 120)
              return
            }
            await waitUntil(() => compareColumnsVisible() && modalVerseBodyHasText(), 18000)
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })()
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_COMPARE_COLUMNS) ??
        document.querySelector(SCRIPTURE_MODAL_VERSE_BODY) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
      onHighlighted: (_el, _step, { driver: drv }) => {
        window.requestAnimationFrame(() => {
          drv.refresh()
        })
      },
      popover: {
        title: narrow ? 'Top and bottom' : 'Two columns',
        description: narrow
          ? 'Each block shows the same reference in a different translation. On smaller screens they stack: the <strong>compare</strong> translation is on <strong>top</strong> and your <strong>main</strong> translation is below. Attribution still appears at the bottom when you scroll.'
          : 'Each column shows the same reference in a different translation. Main translation is on the right; the compare column is on the left. Attribution still appears at the bottom when you scroll.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_COMPARE,
      popover: {
        title: 'Turn off compare',
        description:
          'Open <strong>Compare</strong> again and pick the first row (<strong>Compare</strong>) to return to a single column—or tap <strong>Next</strong> and the tour will do it for you.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          void clearCompareTranslationSelectAsync().then(() => {
            void waitUntil(() => !compareColumnsVisible() && modalVerseBodyHasText(), 12000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 200)
            })
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE,
      popover: {
        title: 'Chapter context',
        description:
          'Tap <strong>Chapter</strong> on this control to load the whole chapter. Your verses stay highlighted in the longer text so you can see what comes before and after. Use <strong>Next</strong> to load it now.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE)?.click()
          void waitUntil(() => !!document.querySelector(SCRIPTURE_MODAL_CHAPTER_BODY), 15000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 300)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_SCROLL_AREA) ??
        document.querySelector(SCRIPTURE_MODAL_CHAPTER_BODY) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
      onHighlighted: (_el, _step, { driver: drv }) => {
        window.requestAnimationFrame(() => {
          drv.refresh()
        })
      },
      popover: {
        title: 'Verse in context',
        description:
          'Scroll inside this area to explore the chapter. The passage you opened is marked so it is easy to spot inside the surrounding verses.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE,
      popover: {
        title: 'Back to single verse',
        description:
          'The same control now shows <strong>Verse</strong>. Tap it to leave chapter view and return to just the passage you opened—compact and easy to read. Use <strong>Next</strong> to switch back for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE)?.click()
          void waitUntil(() => modalSingleVerseViewReady(), 12000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_NEXT,
      popover: {
        title: 'Next passage',
        description:
          'The heading in the center shows the active reference. Tap <strong>▶</strong> (or swipe left on mobile) to jump to the <strong>next</strong> scripture card in profile order—the text updates to that passage. Use <strong>Next</strong> to try it (disabled if there is only one card).',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_NEXT)
          if (btn && !btn.disabled) {
            btn.click()
            void waitUntil(() => modalVerseBodyHasText(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 250)
            })
            return
          }
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 120)
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_PREV,
      popover: {
        title: 'Previous passage',
        description:
          'Tap <strong>◀</strong> (or swipe right) to go <strong>back</strong> to the prior card—the heading and passage text change again so you can step through the outline in order. Use <strong>Next</strong> to try it (disabled if you are on the first card).',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLButtonElement>(SCRIPTURE_MODAL_PREV)
          if (btn && !btn.disabled) {
            btn.click()
            void waitUntil(() => modalVerseBodyHasText(), 15000).then(() => {
              window.setTimeout(() => {
                drv.refresh()
                drv.moveNext()
              }, 250)
            })
            return
          }
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 120)
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_PIN_COLOR) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR) ??
        document.body,
      popover: {
        title: 'Pin a passage (optional)',
        description:
          'Use the <strong>pin</strong> button to open bookmark tints (<strong>red</strong>, <strong>blue</strong>, <strong>green</strong>, <strong>violet</strong>)—saved when you <strong>close</strong> the reader (this device only). The control shows <strong>yellow</strong> for “last verse viewed”; leave it unchanged or pick a menu tint. Clearing pins uses the 📌 on the card or **Clear pinned passages** in the menu. Use <strong>Next</strong> to choose a menu tint for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const root = document.querySelector(SCRIPTURE_MODAL_PIN_COLOR)
          const trigger = root?.querySelector<HTMLButtonElement>('[data-tour="scripture-modal-pin-trigger"]')
          if (
            trigger &&
            !trigger.disabled &&
            !root?.querySelector<HTMLButtonElement>('[role="option"][data-pin-slot]')
          ) {
            trigger.click()
          }
          void waitUntil(
            () => !!root?.querySelector<HTMLButtonElement>('[role="option"][data-pin-slot]'),
            3000
          ).then(() => {
            root?.querySelector<HTMLButtonElement>('[role="option"][data-pin-slot]')?.click()
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, prefersReducedMotion() ? 80 : 160)
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_CLOSE,
      popover: {
        title: 'Close when you are done',
        description:
          'Tap <strong>×</strong> to return to the presentation. Use <strong>Next</strong> to close for this tour.',
        ...pop({ side: 'left', align: 'start' }, { side: 'bottom', align: 'end' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_CLOSE)?.click()
          void waitUntil(() => !document.querySelector(SCRIPTURE_MODAL_TOOLBAR), 5000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 400)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_VERSE_PINNED_CARD) ?? document.querySelector(SCRIPTURE_CARD) ?? document.body,
      popover: {
        title: 'Pinned passage',
        description:
          'The prior step saves a colored <strong>pin</strong> on this passage. Pinned cards stay <strong>tinted and bold</strong> so you can spot them quickly—tints like red and blue can repeat on different passages when you bookmark more of them; <strong>yellow</strong> tracks your latest passage unless another tint bookmarks that verse. The next step spotlights the mini <strong>pin</strong> on the card (one tap removes that bookmark). Then we open the <strong>menu</strong> for the pin list and clear-all control.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_PROGRESS_UNPIN) ??
        document.querySelector(SCRIPTURE_VERSE_PINNED_CARD) ??
        document.querySelector(SCRIPTURE_CARD) ??
        document.body,
      popover: {
        title: 'Pin on the card',
        description:
          'Tap the colored <strong>pin</strong> to remove <strong>only that bookmark</strong> (or yellow’s last-passage marker). <strong>Clear pinned passages</strong> in the menu removes every pin at once. This tour skips unpinning so the next steps can show the menu.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Pins in the menu',
        description:
          'Pinned passages are listed at the <strong>bottom</strong> of the slide-out menu (under profile details). Use <strong>Next</strong> to open the <strong>menu</strong> and scroll there.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
          const settleMs = prefersReducedMotion() ? 120 : 680
          void waitUntil(() => !!document.querySelector(TOC_VERSE_PINS), 5000).then(() => {
            document.querySelector(TOC_VERSE_PINS)?.scrollIntoView({
              block: 'nearest',
              behavior,
            })
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, settleMs)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(TOC_VERSE_PINS) ??
        document.querySelector(PROFILE_SLIDEOUT_MENU) ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const versePinsBlock = document.querySelector<HTMLElement>(TOC_VERSE_PINS)
        versePinsBlock?.scrollIntoView({
          block: 'nearest',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.setTimeout(() => {
              drv.refresh()
            }, prefersReducedMotion() ? 0 : 100)
          })
        })
      },
      popover: {
        title: 'Pinned passages',
        description:
          'This block lists bookmarks and your yellow “last verse” marker and matches the <strong>tinted cards</strong> on the page. Use <strong>Next</strong> to spotlight <strong>Clear pinned passages</strong>.',
        ...pop({ side: 'right', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(TOC_RESET_PROGRESS) ??
        document.querySelector(TOC_VERSE_PINS) ??
        document.querySelector(PROFILE_SLIDEOUT_MENU) ??
        document.body,
      popover: {
        title: 'Clear pinned passages',
        description:
          'Tap <strong>Clear pinned passages</strong> when you want every pin gone for this presentation. Use <strong>Next</strong> (or <strong>Done</strong>) and the tour will tap it for you—then the tour ends while the page updates.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLButtonElement>(TOC_RESET_PROGRESS)
          if (btn && !btn.disabled) {
            btn.click()
            void waitUntil(() => !document.querySelector(SCRIPTURE_VERSE_PINNED_CARD), 8000).then(() => {
              window.setTimeout(() => {
                drv.destroy()
              }, 200)
            })
            return
          }
          window.setTimeout(() => {
            drv.destroy()
          }, 80)
        },
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    stagePadding: narrow ? 14 : 10,
    popoverOffset: narrow ? 26 : 10,
    ...(narrow
      ? {
          onHighlighted: (element, _step, { driver: drv }) => {
            if (element instanceof HTMLElement && element !== document.body) {
              element.scrollIntoView({
                block: 'center',
                inline: 'nearest',
                behavior: prefersReducedMotion() ? 'auto' : 'smooth',
              })
            }
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 0 : 140)
              })
            })
          },
        }
      : {}),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })

  d.drive()
}

/**
 * Resources tour: starts with the slide-out **closed** so step 1 can spotlight the header Menu control
 * (it sits under the drawer when open). Prefetches `/api/profiles/public-templates` for category names/count,
 * then uses Next handlers to open the menu and expand Resources before later steps.
 */
export function runResourcesFeatureTour(options?: ProfileFeatureTourOptions): void {
  void runResourcesFeatureTourAsync(options)
}

async function runResourcesFeatureTourAsync(options?: ProfileFeatureTourOptions): Promise<void> {
  const items = await fetchPublicResourceItemsForTour()
  const menuItems = publicResourceItemsForResourcesMenu(items)
  const groups = groupPublicResourceItems(menuItems)
  const bibleReaderTitle = resolveBibleReaderMenuTitle(items)

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Tap the <strong>menu icon</strong> (top-left) whenever you need the table of contents—<strong>Resources</strong>, text size, Bible translation, print, and links to each section. Use <strong>Next</strong> to open it for this tour.',
        side: 'bottom',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 380)
        },
      },
    },
    {
      element: TOC_RESOURCES_TOGGLE,
      popover: {
        title: 'Resources',
        description:
          'Tap <strong>Resources</strong> to show or hide shared presentations. Use <strong>Next</strong> to expand the list for this tour.',
        side: 'right',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          const t = document.querySelector<HTMLElement>(TOC_RESOURCES_TOGGLE)
          if (!t) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
            return
          }
          // Do not use aria-expanded: driver.js sets aria-expanded="true" on the highlighted
          // element for the popover, which overwrites React's real Resources open state.
          if (!document.querySelector(RESOURCES_LIST_PANEL)) {
            t.click()
          }
          void waitUntil(() => {
            const listPanel = document.querySelector(RESOURCES_LIST_PANEL)
            return !!(listPanel && resourcesListPanelReady(listPanel))
          }, 10000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
          })
        },
      },
    },
    ...(bibleReaderTitle
      ? [
          {
            element: TOC_BIBLE_READER,
            popover: {
              title: escapeForPopoverText(bibleReaderTitle),
              description:
                '<p>This button opens the <strong>Bible Reader</strong>: pick a book, chapter, and optional verses, then read in the scripture modal on the current profile.</p><p class="mt-2">Tap it when you want to read any passage without leaving this presentation.</p>',
              side: 'right' as Side,
              align: 'start' as Alignment,
            },
          } satisfies DriveStep,
        ]
      : []),
    {
      element: RESOURCES_LIST_PANEL,
      popover: {
        title: 'What you will see',
        description: resourcesListOverviewCopy(items),
        side: 'right',
        align: 'start',
      },
    },
  ]

  let templateBlocksVisited = 0
  let categoriesVisited = 0
  let spurgeonLibraryVisited = 0

  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]
    if (g.kind === 'templates') {
      if (templateBlocksVisited >= MAX_RESOURCE_TEMPLATE_BLOCKS) continue
      templateBlocksVisited++
      const blockIndex = String(gi)
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-templates-block="${escapeAttrSelectorValue(blockIndex)}"]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: resourceTemplatesBlockTitle(g.items.length),
          description: resourceTemplatesBlockDescription(g.items),
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'spurgeonLibrary') {
      if (spurgeonLibraryVisited >= 1) continue
      spurgeonLibraryVisited++
      const safeTitle = escapeForPopoverText(g.title.trim() || 'Spurgeon sermons')
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-spurgeon-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens the <strong>Spurgeon sermon library</strong>: search by keyword or by Bible reference, then open a sermon as a read-only presentation.</p><p class="mt-2">Tap it when you want to browse Charles Spurgeon’s sermons that your church has published.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'morningEveningLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || "Spurgeon's Morning & Evening")
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-morneve-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens <strong>Morning and Evening</strong>: jump to today’s devotional or pick any day on the calendar.</p><p class="mt-2">Tap it when you want Spurgeon’s daily readings for a specific date.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'calvinLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || "Calvin's Commentaries")
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-calvin-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens <strong>Calvin’s commentaries</strong>: search by book title or by Bible reference, then open a commentary volume as a read-only presentation.</p><p class="mt-2">Tap it when you want John Calvin’s exposition on a passage or book.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'henryLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || "Matthew Henry's Commentary")
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-henry-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens <strong>Matthew Henry’s commentary</strong>: search by book title or by Bible reference, then open a commentary volume as a read-only presentation.</p><p class="mt-2">Tap it when you want Henry’s exposition on a passage or book.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind === 'edwardsLibrary') {
      const safeTitle = escapeForPopoverText(g.title.trim() || 'Jonathan Edwards sermons')
      steps.push({
        element: () =>
          document.querySelector(
            `${RESOURCES_LIST_PANEL} [data-resource-edwards-library]`
          ) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
        popover: {
          title: safeTitle,
          description:
            '<p>This row opens the <strong>Edwards sermon library</strong>: search by keyword or by Bible reference, then open a Select Sermons volume as a read-only presentation.</p><p class="mt-2">Tap it when you want to browse Jonathan Edwards’s published sermons.</p>',
          side: 'right',
          align: 'start',
        },
      })
      continue
    }

    if (g.kind !== 'category') continue
    if (categoriesVisited >= MAX_RESOURCE_CATEGORY_STEPS) continue
    categoriesVisited++

    const cat = g.item
    const safeCatName = escapeForPopoverText(cat.name.trim() || 'Category')

    steps.push({
      element: () =>
        document.querySelector(`[data-resource-category-id="${escapeAttrSelectorValue(cat.id)}"]`) ??
        document.querySelector(RESOURCES_LIST_PANEL)!,
      popover: {
        title: safeCatName,
        description: resourceCategoryBlockDescription(cat),
        side: 'right',
        align: 'start',
      },
      onHighlightStarted:
        cat.children.length > 0
          ? (_el, _step, { driver: drv }) => expandResourceCategoryIfCollapsed(cat.id, drv)
          : undefined,
    })
  }

  const stepsWithIntro = prependSegmentIntroIfAny(options, steps)
  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    showProgress: stepsWithIntro.length > 1,
    steps: stepsWithIntro,
  })

  d.drive()
}

function findCategoryIdForTemplateSlug(items: PublicResourceItem[], slug: string): string | null {
  for (const i of items) {
    if (i.type === 'category' && i.children.some((c) => c.type === 'template' && c.slug === slug)) return i.id
  }
  return null
}

function templateSlugInTopLevelBlocks(items: PublicResourceItem[], slug: string): boolean {
  for (const g of groupPublicResourceItems(items)) {
    if (g.kind === 'templates' && g.items.some((t) => t.slug === slug)) return true
  }
  return false
}

function queryHomeworkSectionHeading(): HTMLElement | null {
  const headings = document.querySelectorAll<HTMLElement>('main.container h3.print-section-header')
  for (const h of headings) {
    const text = (h.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text.startsWith('Homework')) return h
  }
  return null
}

const PROFILE_QUESTION_BLOCK = '[data-tour="profile-question-block"]'
const PROFILE_SAVE_ANSWER = '[data-tour="profile-save-answer"]'

function queryHomeworkSectionElement(): HTMLElement | null {
  const h = queryHomeworkSectionHeading()
  return h?.closest('section[id]') ?? null
}

function queryHomeworkFirstQuestionBlock(): HTMLElement | null {
  return queryHomeworkSectionElement()?.querySelector<HTMLElement>(PROFILE_QUESTION_BLOCK) ?? null
}

function queryHomeworkFirstSaveAnswerButton(): HTMLElement | null {
  return queryHomeworkSectionElement()?.querySelector<HTMLElement>(PROFILE_SAVE_ANSWER) ?? null
}

/** Marriage seminar: first blue card can mirror the video link; tour spotlights the next scripture card. */
function queryMarriageSeminarScriptureCardForTour(): HTMLElement | null {
  const cards = document.querySelectorAll<HTMLElement>('main.container [data-tour="scripture-card"]')
  if (cards.length >= 2) return cards[1] ?? null
  return cards[0] ?? null
}

function isMarriageSeminarProfilePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/'
  return p === `/${MARRIAGE_SEMINAR_PROFILE_SLUG}` || p.endsWith(`/${MARRIAGE_SEMINAR_PROFILE_SLUG}`)
}

function isDefaultProfilePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/'
  return p === `/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}` || p.endsWith(`/${SCRIPTURE_READER_TOUR_DEFAULT_SLUG}`)
}

function buildMarriageSeminarResourceLinkSelector(): string {
  return `${RESOURCES_LIST_PANEL} a[data-resource-template-slug="${escapeAttrSelectorValue(MARRIAGE_SEMINAR_PROFILE_SLUG)}"]`
}

/**
 * After client navigation to the marriage seminar profile, resumes the driver.js steps on the destination page.
 * Call from `ProfilePageClient` once the profile has loaded.
 */
export function tryStartMarriageSeminarTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== MARRIAGE_SEMINAR_PROFILE_SLUG) return
  const raw = sessionStorage.getItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
  const payload = parseMarriageSeminarTourResumeStorageValue(raw)
  if (!payload) return
  sessionStorage.removeItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
  window.requestAnimationFrame(() => {
    const fullWalkthroughHooks: Pick<ProfileFeatureTourOptions, 'onComplete' | 'onAborted'> | undefined =
      payload.fullWalkthroughChain
        ? {
            onComplete: () => {
              runFullWalkthroughThankYouFinale()
            },
            onAborted: () => {
              clearFullWalkthroughStartSlug()
            },
          }
        : undefined
    runMarriageSeminarResourcesTourPostNavigationOnly({
      captive: payload.captive,
      ...fullWalkthroughHooks,
    })
  })
}

function runMarriageSeminarResourcesTourPostNavigationOnly(options?: ProfileFeatureTourOptions): void {
  const steps: DriveStep[] = [
    {
      element: () =>
        document.querySelector(PROFILE_SECTION_EXTERNAL_LINK) ??
        document.querySelector('main.container') ??
        document.body,
      popover: {
        title: 'Teaching video',
        description:
          'Many seminar-style presentations include a link like this. Tap it in your own time to <strong>watch the recording</strong> for this lesson (it opens in a new tab).',
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: () =>
        queryMarriageSeminarScriptureCardForTour() ??
        document.querySelector('main.container') ??
        document.body,
      popover: {
        title: 'Scripture in this lesson',
        description:
          'On this lesson the <strong>first</strong> blue card often matches the video link above; the <strong>next</strong> cards are scripture. They work like everywhere else on the site: tap to open the reader, compare translations, use the <strong>Chapter</strong>/<strong>Verse</strong> toggle for full-chapter context when helpful, and move to the next or previous passage in order.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () =>
        queryHomeworkSectionHeading() ??
        document.querySelector('main.container') ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const h = queryHomeworkSectionHeading()
        const section = h?.closest('section[id]')
        if (section?.id) {
          scrollToTocAnchor(section.id, {
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          })
        } else {
          h?.scrollIntoView({
            block: 'start',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          })
        }
        window.requestAnimationFrame(() => {
          window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 80 : 400)
        })
      },
      popover: {
        title: 'Homework',
        description:
          'This section holds <strong>reflection questions</strong> for the lesson. The next steps show where to write your answer and how to save it (sign in when the site offers it so answers can sync to your account).',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () =>
        queryHomeworkFirstQuestionBlock() ??
        queryHomeworkSectionElement() ??
        document.querySelector('main.container') ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const block = queryHomeworkFirstQuestionBlock()
        block?.scrollIntoView({
          block: 'center',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
        window.requestAnimationFrame(() => {
          window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 80 : 400)
        })
      },
      popover: {
        title: 'Your answer',
        description:
          'Each card lists a question and a text box. <strong>Type</strong> your response here; a character count helps you stay within the limit. Use <strong>Next</strong> to see how saving works.',
        side: 'top',
        align: 'start',
      },
    },
    {
      element: () =>
        queryHomeworkFirstSaveAnswerButton() ??
        queryHomeworkFirstQuestionBlock() ??
        queryHomeworkSectionElement() ??
        document.querySelector('main.container') ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const btn = queryHomeworkFirstSaveAnswerButton()
        btn?.scrollIntoView({
          block: 'center',
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        })
        window.requestAnimationFrame(() => {
          window.setTimeout(() => drv.refresh(), prefersReducedMotion() ? 80 : 400)
        })
      },
      popover: {
        title: 'Save Answer',
        description:
          'Tap <strong>Save Answer</strong> to store what you wrote on this device right away.',
        side: 'top',
        align: 'start',
      },
    },
  ]

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig(options),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })
  d.drive()
}

/**
 * Marriage seminar: Menu → Resources → (Marriage folder when used) → open **Marriage: A Biblical Perspective**,
 * then (after navigation) recording link, first scripture card, and Homework.
 */
export function runMarriageSeminarResourcesTour(options?: ProfileFeatureTourOptions): void {
  void runMarriageSeminarResourcesTourAsync(options)
}

async function runMarriageSeminarResourcesTourAsync(options?: ProfileFeatureTourOptions): Promise<void> {
  if (typeof window === 'undefined') return

  if (isMarriageSeminarProfilePath(window.location.pathname)) {
    runMarriageSeminarResourcesTourPostNavigationOnly(options)
    return
  }

  const items = await fetchPublicResourceItemsForTour()
  const linkSel = buildMarriageSeminarResourceLinkSelector()
  const categoryId = findCategoryIdForTemplateSlug(items, MARRIAGE_SEMINAR_PROFILE_SLUG)
  const inTopLevel = templateSlugInTopLevelBlocks(items, MARRIAGE_SEMINAR_PROFILE_SLUG)
  const hasListedTemplate =
    inTopLevel ||
    items.some(
      (i) =>
        i.type === 'category' &&
        i.children.some((c) => c.type === 'template' && c.slug === MARRIAGE_SEMINAR_PROFILE_SLUG)
    )

  let navigationScheduled = false

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Use the <strong>menu icon</strong> to reach shared seminar profiles under <strong>Resources</strong>. Use <strong>Next</strong> to open it for this tour.',
        side: 'bottom',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          window.setTimeout(() => {
            drv.refresh()
            drv.moveNext()
          }, 380)
        },
      },
    },
    {
      element: TOC_RESOURCES_TOGGLE,
      popover: {
        title: 'Resources',
        description:
          'Open <strong>Resources</strong> to see presentations your church published—including marriage seminar lessons when they are enabled. Use <strong>Next</strong> to expand the list.',
        side: 'right',
        align: 'start',
        onNextClick: (_e, _s, { driver: drv }) => {
          const t = document.querySelector<HTMLElement>(TOC_RESOURCES_TOGGLE)
          if (!t) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
            return
          }
          if (!document.querySelector(RESOURCES_LIST_PANEL)) {
            t.click()
          }
          void waitUntil(() => {
            const listPanel = document.querySelector(RESOURCES_LIST_PANEL)
            return !!(listPanel && resourcesListPanelReady(listPanel))
          }, 10000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
          })
        },
      },
    },
  ]

  if (categoryId && !inTopLevel) {
    const cat = items.find((i) => i.type === 'category' && i.id === categoryId) as
      | Extract<PublicResourceItem, { type: 'category' }>
      | undefined
    const safeName = escapeForPopoverText(cat?.name.trim() || 'Marriage')
    steps.push({
      element: () =>
        document.querySelector(`[data-resource-category-id="${escapeAttrSelectorValue(categoryId)}"]`) ??
        document.querySelector(RESOURCES_LIST_PANEL)!,
      popover: {
        title: safeName,
        description:
          '<p>Marriage seminar profiles are often grouped here. The next step highlights <strong>Marriage: A Biblical Perspective</strong>—use <strong>Next</strong> to open that presentation (the folder expands if it was closed).</p>',
        side: 'right',
        align: 'start',
      },
      onHighlightStarted: (_el, _step, { driver: drv }) =>
        expandResourceCategoryIfCollapsed(categoryId, drv),
    })
  }

  steps.push({
    element: () => document.querySelector(linkSel) ?? document.querySelector(RESOURCES_LIST_PANEL)!,
    onHighlightStarted: (_el, _step, { driver: drv }) => {
      if (categoryId) {
        expandResourceCategoryIfCollapsed(categoryId, drv)
      }
      const link = document.querySelector<HTMLElement>(linkSel)
      link?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    },
    popover: {
      title: 'Open this lesson',
      description: hasListedTemplate
        ? '<p>Tap <strong>Marriage: A Biblical Perspective</strong> to load that presentation—or use <strong>Next</strong> and this tour will open it for you. The following steps explain the recording link, scripture cards, and homework on that page.</p>'
        : '<p>This church’s resource list does not currently include that profile, so the link may be missing here. When it appears under Resources, tapping it opens the lesson. You can also ask your administrator if you expected to see it.</p>',
      side: 'right',
      align: 'start',
      onNextClick: (_e, _s, { driver: drv }) => {
        const link = document.querySelector<HTMLElement>(linkSel)
        if (!link || !hasListedTemplate) {
          window.setTimeout(() => drv.destroy(), 80)
          return
        }
        navigationScheduled = true
        try {
          sessionStorage.setItem(
            MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY,
            serializeMarriageSeminarTourResumeForNavigation(options)
          )
        } catch {
          navigationScheduled = false
          window.setTimeout(() => drv.destroy(), 80)
          return
        }
        link.click()
        window.setTimeout(() => {
          drv.destroy()
        }, 200)
      },
    },
  })

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      ...options,
      onAborted: () => {
        if (!navigationScheduled) {
          try {
            sessionStorage.removeItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
          } catch {
            /* ignore */
          }
        }
        options?.onAborted?.()
      },
      onComplete: () => {
        if (!navigationScheduled) {
          try {
            sessionStorage.removeItem(MARRIAGE_SEMINAR_TOUR_RESUME_STORAGE_KEY)
          } catch {
            /* ignore */
          }
          options?.onComplete?.()
        }
        /* When navigating to the marriage profile, chain `onComplete` runs after post-navigation steps
         * (`tryStartMarriageSeminarTourAfterNavigation` reattaches it). */
      },
    }),
    showProgress: true,
    steps: prependSegmentIntroIfAny(options, steps),
  })

  d.drive()
}

/**
 * Final full-walkthrough step: thank-you message, then browser navigation back to the profile slug stored at walkthrough start.
 * Exported for tests (`scriptureReaderTourNavigation.assign`).
 */
export function runFullWalkthroughThankYouFinale(): void {
  const slug = readFullWalkthroughStartSlug() ?? SCRIPTURE_READER_TOUR_DEFAULT_SLUG
  clearFullWalkthroughStartSlug()
  const targetPath = `/${slug}`

  const goHome = (): void => {
    scriptureReaderTourNavigation.assign(targetPath)
  }

  const d = createProfileHelpDriver({
    ...baseProfileHelpDriverConfig({
      onComplete: goHome,
      onAborted: goHome,
    }),
    doneBtnText: 'Continue',
    showProgress: false,
    steps: [
      {
        element: () => document.body,
        popover: {
          title: 'Thank you',
          description:
            '<p>Thanks for watching.</p><p>May God bless your study of His Word.</p>',
          side: 'over',
          align: 'center',
        },
      },
    ],
  })

  d.drive()
}

type FullProfileWalkthroughSegment = {
  run: (opts?: ProfileFeatureTourOptions) => void
  intro: { title: string; description: string }
}

const FULL_WALKTHROUGH_SEGMENTS_FROM_RESOURCES: FullProfileWalkthroughSegment[] = [
  {
    run: runResourcesFeatureTour,
    intro: {
      title: 'Resources menu',
      description:
        'Shared presentations from your church: top-level links, category folders, and how to open another profile.',
    },
  },
  {
    run: runTableOfContentsFeatureTour,
    intro: {
      title: 'Table of contents',
      description: 'Jump to any main section or subsection of this presentation from the slide-out menu.',
    },
  },
  {
    run: runTextSizeFeatureTour,
    intro: {
      title: 'Text size',
      description: 'Make on-screen reading normal, larger, or largest; your choice is remembered in this browser.',
    },
  },
  {
    run: runPrintFeatureTour,
    intro: {
      title: 'Print version',
      description: 'A print-friendly layout with dark text on white for paper or PDF.',
    },
  },
  {
    run: runBibleTranslationFeatureTour,
    intro: {
      title: 'Bible translation',
      description:
        'Use the Bible Translation control in the menu (under Print Version), then pick a version from the list—the same button-and-list pattern as Text size.',
    },
  },
  {
    run: runScriptureModalFeatureTour,
    intro: {
      title: 'Scripture reader',
      description:
        'Full-screen reader: compare translations, chapter view, stepping next/previous, optional colored pins saved when you close (local only), and clearing pins from the menu.',
    },
  },
  {
    run: runWordStudyFeatureTour,
    intro: {
      title: 'Greek and Hebrew word study',
      description:
        'Original-language tokens and Strong’s lexicon in the scripture reader: Greek, Hebrew, or Aramaic toolbar button, word chips, and the definition sheet.',
    },
  },
  {
    run: runMemorizeFeatureTour,
    intro: {
      title: 'Verse memorization',
      description:
        'Open a scripture card, save with Memorize in the reader, open the Memorize list, start practice from the verse row (intro + round 1), then remove the verse we add for this tour.',
    },
  },
  {
    run: runAddCustomMemorizationFeatureTour,
    intro: {
      title: 'Add custom memorization',
      description:
        'Open Menu → Memorize → + Add to pick any book, chapter, and verse (Genesis 1:1 for this tour), then the Add button—no verse is actually saved.',
    },
  },
  {
    run: runScriptureHoverPreviewFeatureTour,
    intro: {
      title: 'Quick verse preview',
      description:
        'Desktop: hover; phone or app: press-and-hold—popover demo of a quick verse card on paragraph links and blue section buttons.',
    },
  },
  {
    run: runMarriageSeminarResourcesTour,
    intro: {
      title: 'Marriage seminar resources',
      description:
        'Opens the shared marriage lesson from Resources (this segment navigates to another profile), then covers the video link, scripture cards, and homework questions.',
    },
  },
]

/** Header toolbar tutorials after theme, right-to-left chip order: Share → bookmarks → Highlights → Listen (when shown). */
function getFullWalkthroughHeaderToolbarAfterThemeSegments(): FullProfileWalkthroughSegment[] {
  const mid: FullProfileWalkthroughSegment[] = [
    {
      run: runShareResourceFeatureTour,
      intro: {
        title: 'Share this resource',
        description:
          'Copy a link to this presentation or use your device’s share sheet when available.',
      },
    },
    {
      run: runBookmarksFeatureTour,
      intro: {
        title: 'Using bookmarks',
        description:
          'What bookmarks are, how scroll position matters, then add a practice bookmark, see it in the list, and remove it.',
      },
    },
    {
      run: runHighlightsFeatureTour,
      intro: {
        title: 'Highlights',
        description:
          'Save quotes from section content and return to them from the highlights list; search and remove entries as needed.',
      },
    },
  ]
  if (isProfileResourceListenControlAvailable()) {
    mid.push({
      run: runProfileListenFeatureTour,
      intro: {
        title: 'Listen (read aloud)',
        description:
          'Use the header speaker control to hear this presentation read aloud: pick a section, play or pause, adjust speed, optional read-along underline, and Word vs Line highlight width.',
      },
    })
  }
  return mid
}

function getFullWalkthroughSegments(): FullProfileWalkthroughSegment[] {
  return [
    {
      run: runThemeFeatureTour,
      intro: {
        title: 'Light and dark mode',
        description:
          'Switch between light and dark appearance; this segment briefly flips the theme once, then restores your previous setting.',
      },
    },
    ...getFullWalkthroughHeaderToolbarAfterThemeSegments(),
    ...FULL_WALKTHROUGH_SEGMENTS_FROM_RESOURCES,
  ]
}

function getFullWalkthroughIndexAfterScriptureReader(): number {
  const segments = getFullWalkthroughSegments()
  const i = segments.findIndex((s) => s.run === runScriptureModalFeatureTour)
  return i >= 0 ? i + 1 : segments.length
}

function getFullWalkthroughIndexAfterWordStudy(): number {
  const segments = getFullWalkthroughSegments()
  const i = segments.findIndex((s) => s.run === runWordStudyFeatureTour)
  return i >= 0 ? i + 1 : segments.length
}

function getFullWalkthroughIndexAfterMemorize(): number {
  const segments = getFullWalkthroughSegments()
  const i = segments.findIndex((s) => s.run === runMemorizeFeatureTour)
  return i >= 0 ? i + 1 : segments.length
}

/** Resume the chained full walkthrough from a segment index (used after scripture reader navigates to `/default`). */
function runFullProfileHelpTutorialFromSegment(startIndex: number): void {
  const segments = getFullWalkthroughSegments()
  const runAt = (index: number): void => {
    if (index >= segments.length) return
    const isLast = index === segments.length - 1
    const { run, intro } = segments[index]
    run({
      captive: true,
      segmentIntro: intro,
      onAborted: () => {
        clearFullWalkthroughStartSlug()
      },
      onComplete: isLast
        ? () => {
            window.requestAnimationFrame(() => runFullWalkthroughThankYouFinale())
          }
        : () => {
            window.requestAnimationFrame(() => runAt(index + 1))
          },
    })
  }
  runAt(startIndex)
}

/** Runs every profile tutorial in the same order as the Help menu, one after another. */
export function runFullProfileHelpTutorial(): void {
  if (typeof window !== 'undefined') {
    try {
      const slug = getPresentationSlugFromPathname(window.location.pathname)
      sessionStorage.setItem(
        FULL_WALKTHROUGH_START_SLUG_STORAGE_KEY,
        JSON.stringify({ v: 1, slug } satisfies FullWalkthroughStartSlugPayloadV1)
      )
    } catch {
      /* quota / private mode */
    }
  }
  runFullProfileHelpTutorialFromSegment(0)
}

/**
 * After navigation to `/default`, resumes the scripture reader tour if `runScriptureModalFeatureTour` scheduled it.
 * Call from `ProfilePageClient` once the profile has loaded.
 */
/**
 * After navigation to `/default`, resumes the word study tour if `runWordStudyFeatureTour` scheduled it.
 */
export function tryStartWordStudyTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== SCRIPTURE_READER_TOUR_DEFAULT_SLUG) return
  const raw = sessionStorage.getItem(WORD_STUDY_TOUR_RESUME_STORAGE_KEY)
  if (!raw) return
  sessionStorage.removeItem(WORD_STUDY_TOUR_RESUME_STORAGE_KEY)
  let payload: ScriptureReaderTourResumePayloadV1
  try {
    payload = JSON.parse(raw) as ScriptureReaderTourResumePayloadV1
  } catch {
    return
  }
  if (payload.v !== 1) return
  const continueAt = payload.continueFullWalkthroughAt
  const resumeOptions: ProfileFeatureTourOptions = {
    captive: payload.captiveForTour,
    segmentIntro: payload.segmentIntro,
    onComplete:
      continueAt !== undefined
        ? () => {
            window.requestAnimationFrame(() => runFullProfileHelpTutorialFromSegment(continueAt))
          }
        : undefined,
  }
  window.requestAnimationFrame(() => {
    runWordStudyFeatureTourOnCurrentPage(resumeOptions)
  })
}

export function tryStartScriptureReaderTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== SCRIPTURE_READER_TOUR_DEFAULT_SLUG) return
  const raw = sessionStorage.getItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
  if (!raw) return
  sessionStorage.removeItem(SCRIPTURE_READER_TOUR_RESUME_STORAGE_KEY)
  let payload: ScriptureReaderTourResumePayloadV1
  try {
    payload = JSON.parse(raw) as ScriptureReaderTourResumePayloadV1
  } catch {
    return
  }
  if (payload.v !== 1) return
  const continueAt = payload.continueFullWalkthroughAt
  const resumeOptions: ProfileFeatureTourOptions = {
    captive: payload.captiveForTour,
    segmentIntro: payload.segmentIntro,
    onComplete:
      continueAt !== undefined
        ? () => {
            window.requestAnimationFrame(() => runFullProfileHelpTutorialFromSegment(continueAt))
          }
        : undefined,
  }
  window.requestAnimationFrame(() => {
    runScriptureModalFeatureTourOnCurrentPage(resumeOptions)
  })
}

/**
 * After navigation to `/default`, resumes the verse memorization tour if `runMemorizeFeatureTour` scheduled it.
 * Call from `ProfilePageClient` once the profile has loaded.
 */
export function tryStartMemorizeTourAfterNavigation(currentSlug: string): void {
  if (typeof window === 'undefined') return
  if (currentSlug !== SCRIPTURE_READER_TOUR_DEFAULT_SLUG) return
  const raw = sessionStorage.getItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
  if (!raw) return
  sessionStorage.removeItem(MEMORIZE_TOUR_RESUME_STORAGE_KEY)
  let payload: ScriptureReaderTourResumePayloadV1
  try {
    payload = JSON.parse(raw) as ScriptureReaderTourResumePayloadV1
  } catch {
    return
  }
  if (payload.v !== 1) return
  const continueAt = payload.continueFullWalkthroughAt
  const resumeOptions: ProfileFeatureTourOptions = {
    captive: payload.captiveForTour,
    segmentIntro: payload.segmentIntro,
    onComplete:
      continueAt !== undefined
        ? () => {
            window.requestAnimationFrame(() => runFullProfileHelpTutorialFromSegment(continueAt))
          }
        : undefined,
  }
  window.requestAnimationFrame(() => {
    runMemorizeFeatureTourOnCurrentPage(resumeOptions)
  })
}
