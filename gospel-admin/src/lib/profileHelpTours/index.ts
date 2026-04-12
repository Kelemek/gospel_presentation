import { driver, type Alignment, type Config, type DriveStep, type Driver, type Side } from 'driver.js'
import 'driver.js/dist/driver.css'
import { Capacitor } from '@capacitor/core'
import type { PublicResourceItem } from '@/lib/supabase-data-service'
import { groupPublicResourceItems } from '@/lib/groupPublicResourceItems'
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

const BOOKMARKS_TRIGGER = '[data-tour="bookmarks-trigger"]'
const BOOKMARKS_PANEL = '[data-tour="bookmarks-panel"]'
const BOOKMARKS_ADD = '[data-tour="bookmarks-add"]'
const BOOKMARKS_ROW = '[data-tour="bookmarks-row"]'
const BOOKMARKS_REMOVE = '[data-tour="bookmarks-remove"]'
const ALERT_MODAL_CONFIRM = '[data-tour="alert-modal-confirm"]'
const THEME_TOGGLE = '[data-tour="theme-toggle"]'

const PROFILE_MENU_BUTTON = '[data-tour="profile-menu-button"]'
const PROFILE_SLIDEOUT_MENU = '[data-tour="profile-slideout-menu"]'
const TOC_RESOURCES_TOGGLE = '[data-tour="toc-resources-toggle"]'
const TOC_TEXT_SIZE_TOGGLE = '[data-tour="toc-text-size-toggle"]'
const TEXT_SIZE_PANEL = '[data-tour="text-size-panel"]'
const TOC_PRINT_VERSION = '[data-tour="toc-print-version"]'
const TOC_BIBLE_TRANSLATION_TOGGLE = '[data-tour="toc-bible-translation-toggle"]'
const BIBLE_TRANSLATION_PANEL = '[data-tour="bible-translation-panel"]'
const TOC_SECTION_LINKS = '[data-tour="toc-section-links"]'
const TOC_READING_PROGRESS = '[data-tour="toc-reading-progress"]'
const TOC_RESET_PROGRESS = '[data-tour="toc-reset-progress"]'
const SCRIPTURE_CARD = '[data-tour="scripture-card"]'
const SCRIPTURE_MODAL_TOOLBAR = '[data-tour="scripture-modal-toolbar"]'
const SCRIPTURE_MODAL_CONTEXT = '[data-tour="scripture-modal-context"]'
const SCRIPTURE_MODAL_VERSE_BODY = '[data-tour="scripture-modal-verse-body"]'
const SCRIPTURE_MODAL_COMPARE = '[data-tour="scripture-modal-compare"]'
const SCRIPTURE_MODAL_COMPARE_COLUMNS = '[data-tour="scripture-modal-compare-columns"]'
const SCRIPTURE_MODAL_CHAPTER_CONTEXT_BTN = '[data-tour="scripture-modal-chapter-context"]'
const SCRIPTURE_MODAL_CHAPTER_BODY = '[data-tour="scripture-modal-chapter-body"]'
/** Scrollable passage area — must be the driver.js spotlight during chapter context so wheel/touch scroll works (overlay only restores pointer-events on the active element and its subtree). */
const SCRIPTURE_MODAL_SCROLL_AREA = '[data-tour="scripture-modal-scroll-area"]'
const SCRIPTURE_MODAL_VERSE_TAB = '[data-tour="scripture-modal-verse-tab"]'
const SCRIPTURE_MODAL_PREV = '[data-tour="scripture-modal-prev"]'
const SCRIPTURE_MODAL_NEXT = '[data-tour="scripture-modal-next"]'
const SCRIPTURE_MODAL_CLOSE = '[data-tour="scripture-modal-close"]'
const SCRIPTURE_LAST_VIEWED_CARD = '[data-scripture-last-viewed="true"]'
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
const PROFILE_HELP_TOUR_ANDROID_FALLBACK_BOTTOM_INSET_PX = 56
/** Capacitor Android WebView: reserve extra space above gesture / system nav (matches heavy overlap reports). */
const PROFILE_HELP_TOUR_CAPACITOR_ANDROID_BOTTOM_INSET_PX = 72

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

export function applyProfileHelpTourPopoverSafeAreaNudge(wrapper: HTMLElement): void {
  if (typeof window === 'undefined' || !wrapper.isConnected) return
  const insets = getProfileHelpTourPopoverSafeInsets()
  if (insets.top === 0 && insets.right === 0 && insets.bottom === 0 && insets.left === 0) return

  const vw = window.innerWidth
  const vh = window.innerHeight
  const safeL = insets.left
  const safeT = insets.top
  const safeR = vw - insets.right
  const safeB = vh - insets.bottom

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

function scheduleProfileHelpTourPopoverSafeAreaNudge(wrapper: HTMLElement): void {
  const run = (): void => {
    if (wrapper.isConnected) {
      applyProfileHelpTourPopoverSafeAreaNudge(wrapper)
    }
  }
  // driver.js calls `scrollIntoView` on the popover after positioning; run after microtask + 2 rAFs so layout matches.
  queueMicrotask(run)
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run)
    })
  }
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

function dispatchSelectChangeNative(sel: HTMLSelectElement): void {
  sel.dispatchEvent(new Event('input', { bubbles: true }))
  sel.dispatchEvent(new Event('change', { bubbles: true }))
}

function selectFirstCompareTranslationOption(): boolean {
  const sel = document.querySelector<HTMLSelectElement>(SCRIPTURE_MODAL_COMPARE)
  if (!sel || sel.options.length < 2) return false
  for (let i = 0; i < sel.options.length; i++) {
    const opt = sel.options[i]
    if (opt?.value) {
      sel.selectedIndex = i
      dispatchSelectChangeNative(sel)
      return true
    }
  }
  return false
}

function clearCompareTranslationSelect(): void {
  const sel = document.querySelector<HTMLSelectElement>(SCRIPTURE_MODAL_COMPARE)
  if (!sel) return
  sel.selectedIndex = 0
  dispatchSelectChangeNative(sel)
}

function modalVerseBodyHasText(): boolean {
  const el = document.querySelector(SCRIPTURE_MODAL_VERSE_BODY)
  if (!el) return false
  const t = (el.textContent ?? '').replace(/\s/g, '')
  return t.length > 20
}

function compareColumnsVisible(): boolean {
  return !!document.querySelector(SCRIPTURE_MODAL_COMPARE_COLUMNS)
}

function modalSingleVerseViewReady(): boolean {
  return modalVerseBodyHasText() && !document.querySelector(SCRIPTURE_MODAL_CHAPTER_BODY)
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

function resourcesListOverviewCopy(items: PublicResourceItem[], numCategories: number): string {
  if (items.length === 0) {
    return 'Nothing is listed yet. When your church adds shared profiles or categories in admin, they will appear here.'
  }
  if (numCategories === 0) {
    return 'The next steps highlight each group of top-level links and explain what those presentations are for—tap a link when you want to open one.'
  }
  return 'The next steps highlight each section: groups of top-level links and each category folder. Each step lists what is inside and what those resources are for. Folders expand automatically when highlighted—tap any link when you want to open a presentation.'
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
  if (cat.templates.length === 0) {
    return `<p>This folder (<strong>${safeCatName}</strong>) is for related presentations. None are listed yet—your church can add shared profiles here in admin.</p>`
  }
  const titles = cat.templates.map((t) => escapeForPopoverText(t.title.trim() || t.slug))
  const list = titles.map((t) => `<li><strong>${t}</strong></li>`).join('')
  return `<p>These are shared gospel profiles grouped under <strong>${safeCatName}</strong>. Each link opens a different presentation.</p><ul class="list-disc pl-5 mt-2 text-sm">${list}</ul><p class="mt-2">Tap a link when you want to open one.</p>`
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
  if (block.querySelector('a[data-resource-template-slug]')) return
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
            '<strong>Where you are</strong> on the page matters: bookmarks use your place in the presentation to pick the best <strong>section</strong> for the list. Use <strong>Next</strong> to continue.',
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
            'This panel lists your saved places. Use <strong>Add bookmark</strong> to capture this profile and your current section—or use <strong>Next</strong> and this tour will add one for you. Open a row to jump there, or another profile. The next steps show your bookmark in the list and how to remove it. If this spot was already saved, you will still see the row and removal steps.',
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
            'This row is your saved place for this profile and section—tap it to jump back here. If you already had a bookmark for this spot, it is the same row. Use <strong>Next</strong> to see how to remove it with the trash icon.',
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
            'Tap <strong>Menu</strong> (top-left) to open the table of contents, where you will find <strong>Text size</strong> and other controls. Use <strong>Next</strong> to open it for this tour.',
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
            'Tap <strong>Menu</strong> (top-left) to open the table of contents, where you will find <strong>Print Version</strong> along with Resources, text size, and Bible translation. Use <strong>Next</strong> to open it for this tour.',
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
            'Tap <strong>Menu</strong> (top-left) to open the table of contents, where you will find <strong>Bible Translation</strong> (under <strong>Print Version</strong>) and other controls. Use <strong>Next</strong> to open the menu for this tour.',
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
            'Tap <strong>Menu</strong> (top-left) to open the slide-out. At the top you will find <strong>Resources</strong>, <strong>Text size</strong>, <strong>Print</strong>, and <strong>Bible translation</strong>. Below that is the <strong>table of contents</strong>—links that match each section of this presentation. Use <strong>Next</strong> to open the menu for this tour.',
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
 * Scripture modal tour: opens the first scripture **card** on the page, then walks compare, chapter context,
 * Verse tab (back to single passage), next/prev arrows, close, pinned card, pin spotlight (explained only—no unpin),
 * **Menu** reading progress, and **Reset Progress**.
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
        document.querySelector(SCRIPTURE_MODAL_CONTEXT) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR) ??
        document.body,
      popover: {
        title: 'Presentation context',
        description:
          'When available, this area shows which <strong>section</strong> and <strong>subsection</strong> you are in, plus a short summary from the outline—so you remember how this passage fits the lesson.',
        ...pop({ side: 'bottom', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_VERSE_BODY) ?? document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
      popover: {
        title: 'The passage',
        description:
          'The verse or range appears here in the translation you chose in the menu (or the site default). Use the toolbar above to compare, change chapter view, or move to another passage.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: SCRIPTURE_MODAL_COMPARE,
      popover: {
        title: 'Compare translations',
        description:
          'Open <strong>Compare</strong> and pick a second version to read the same passage side by side (when your church has more than one translation enabled). Use <strong>Next</strong> to turn it on for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const applied = selectFirstCompareTranslationOption()
          if (!applied) {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 120)
            return
          }
          void waitUntil(() => compareColumnsVisible() && modalVerseBodyHasText(), 18000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 250)
          })
        },
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_MODAL_COMPARE_COLUMNS) ??
        document.querySelector(SCRIPTURE_MODAL_VERSE_BODY) ??
        document.querySelector(SCRIPTURE_MODAL_TOOLBAR)!,
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
          'Choose <strong>Compare</strong> again and pick the blank first row (or use <strong>Next</strong>) to return to a single column.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          clearCompareTranslationSelect()
          void waitUntil(() => !compareColumnsVisible() && modalVerseBodyHasText(), 12000).then(() => {
            window.setTimeout(() => {
              drv.refresh()
              drv.moveNext()
            }, 200)
          })
        },
      },
    },
    {
      element: SCRIPTURE_MODAL_CHAPTER_CONTEXT_BTN,
      popover: {
        title: 'Chapter context',
        description:
          'Tap <strong>Chapter Context</strong> to load the whole chapter. Your verses stay highlighted in the longer text so you can see what comes before and after. Use <strong>Next</strong> to load it now.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_CHAPTER_CONTEXT_BTN)?.click()
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
      element: SCRIPTURE_MODAL_VERSE_TAB,
      popover: {
        title: 'Back to single verse',
        description:
          'Tap <strong>Verse</strong> to leave chapter view and return to just the passage you opened—compact and easy to read. Use <strong>Next</strong> to switch back for this tour.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          document.querySelector<HTMLElement>(SCRIPTURE_MODAL_VERSE_TAB)?.click()
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
        document.querySelector(SCRIPTURE_LAST_VIEWED_CARD) ?? document.querySelector(SCRIPTURE_CARD) ?? document.body,
      popover: {
        title: 'Pinned passage',
        description:
          'After you close the reader, the <strong>last passage you were viewing</strong> stays marked on its blue card: yellow highlight and bold text so you can find it quickly. The next step spotlights the <strong>pin</strong> on that card (this tour will not clear progress there), then the tour shows <strong>Reset Progress</strong> in <strong>Menu</strong>.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(SCRIPTURE_PROGRESS_UNPIN) ??
        document.querySelector(SCRIPTURE_LAST_VIEWED_CARD) ??
        document.querySelector(SCRIPTURE_CARD) ??
        document.body,
      popover: {
        title: 'Pin on the card',
        description:
          'Tap this <strong>pin</strong> anytime to clear reading progress for this presentation—the yellow highlight goes away until you open another passage. It does the same job as <strong>Reset Progress</strong> in the slide-out menu. This tour skips tapping it so your progress stays pinned while we show the menu reset next.',
        ...pop({ side: 'top', align: 'start' }),
      },
    },
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Reset from the menu',
        description:
          'The same reading progress appears at the <strong>bottom</strong> of the slide-out menu under the profile details. Use <strong>Next</strong> to open <strong>Menu</strong> and scroll there.',
        ...pop({ side: 'bottom', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          openProfileMenuIfClosed()
          const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
          const settleMs = prefersReducedMotion() ? 120 : 680
          void waitUntil(() => !!document.querySelector(TOC_READING_PROGRESS), 5000).then(() => {
            document.querySelector(TOC_READING_PROGRESS)?.scrollIntoView({
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
        document.querySelector(TOC_READING_PROGRESS) ??
        document.querySelector(PROFILE_SLIDEOUT_MENU) ??
        document.body,
      onHighlighted: (_el, _step, { driver: drv }) => {
        const progress = document.querySelector<HTMLElement>(TOC_READING_PROGRESS)
        progress?.scrollIntoView({
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
        title: 'Reading progress',
        description:
          'This block matches the <strong>highlighted card</strong> on the page. <strong>Reset Progress</strong> clears the saved passage for this presentation (and removes the yellow styling). Use <strong>Next</strong> to spotlight the reset control.',
        ...pop({ side: 'right', align: 'start' }),
      },
    },
    {
      element: () =>
        document.querySelector(TOC_RESET_PROGRESS) ??
        document.querySelector(TOC_READING_PROGRESS) ??
        document.querySelector(PROFILE_SLIDEOUT_MENU) ??
        document.body,
      popover: {
        title: 'Reset Progress',
        description:
          'Tap <strong>Reset Progress</strong> when you want a fresh start. Use <strong>Next</strong> (or <strong>Done</strong>) and the tour will tap it for you—then the tour ends while the page updates.',
        ...pop({ side: 'right', align: 'start' }),
        onNextClick: (_e, _s, { driver: drv }) => {
          const btn = document.querySelector<HTMLButtonElement>(TOC_RESET_PROGRESS)
          if (btn && !btn.disabled) {
            btn.click()
            void waitUntil(() => !document.querySelector(SCRIPTURE_LAST_VIEWED_CARD), 8000).then(() => {
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
  const numCategories = items.filter((i) => i.type === 'category').length
  const groups = groupPublicResourceItems(items)

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Tap <strong>Menu</strong> (top-left) whenever you need the table of contents—<strong>Resources</strong>, text size, Bible translation, print, and links to each section. Use <strong>Next</strong> to open it for this tour.',
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
    {
      element: RESOURCES_LIST_PANEL,
      popover: {
        title: 'What you will see',
        description: resourcesListOverviewCopy(items, numCategories),
        side: 'right',
        align: 'start',
      },
    },
  ]

  let templateBlocksVisited = 0
  let categoriesVisited = 0

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
        cat.templates.length > 0
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
    if (i.type === 'category' && i.templates.some((t) => t.slug === slug)) return i.id
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
          'On this lesson the <strong>first</strong> blue card often matches the video link above; the <strong>next</strong> cards are scripture. They work like everywhere else on the site: tap to open the reader, compare translations, view chapter context, and move to the next or previous passage in order.',
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
      (i) => i.type === 'category' && i.templates.some((t) => t.slug === MARRIAGE_SEMINAR_PROFILE_SLUG)
    )

  let navigationScheduled = false

  const steps: DriveStep[] = [
    {
      element: PROFILE_MENU_BUTTON,
      popover: {
        title: 'Menu',
        description:
          'Use <strong>Menu</strong> to reach shared seminar profiles under <strong>Resources</strong>. Use <strong>Next</strong> to open it for this tour.',
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

const FULL_WALKTHROUGH_SEGMENTS: Array<{
  run: (opts?: ProfileFeatureTourOptions) => void
  intro: { title: string; description: string }
}> = [
  {
    run: runBookmarksFeatureTour,
    intro: {
      title: 'Using bookmarks',
      description:
        'What bookmarks are, how scroll position matters, then add a practice bookmark, see it in the list, and remove it.',
    },
  },
  {
    run: runThemeFeatureTour,
    intro: {
      title: 'Light and dark mode',
      description:
        'Switch between light and dark appearance; this segment briefly flips the theme once, then restores your previous setting.',
    },
  },
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
        'The full-screen reader: compare translations, chapter view, next and previous passages, pins, and resetting progress from the menu.',
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

function getFullWalkthroughIndexAfterScriptureReader(): number {
  const i = FULL_WALKTHROUGH_SEGMENTS.findIndex((s) => s.run === runScriptureModalFeatureTour)
  return i >= 0 ? i + 1 : FULL_WALKTHROUGH_SEGMENTS.length
}

/** Resume the chained full walkthrough from a segment index (used after scripture reader navigates to `/default`). */
function runFullProfileHelpTutorialFromSegment(startIndex: number): void {
  const runAt = (index: number): void => {
    if (index >= FULL_WALKTHROUGH_SEGMENTS.length) return
    const isLast = index === FULL_WALKTHROUGH_SEGMENTS.length - 1
    const { run, intro } = FULL_WALKTHROUGH_SEGMENTS[index]
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
