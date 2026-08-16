import { driver, type Config, type DriveStep, type Driver } from 'driver.js'
import { Capacitor } from '@capacitor/core'
import {
  getProfileHeaderScrollOffset,
  getSafeAreaInsetsPx,
  scrollToTocAnchor,
} from '@/lib/scrollToTocAnchor'
import {
  GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT,
  GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT,
} from '@/lib/bookmarksPanelCloseEvent'
import * as tourSelectors from './tourSharedSelectors'

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Matches Tailwind `md` (~768px): use popunder + extra offsets so driver.js does not cover the spotlight on phones. */
export function isNarrowProfileHelpTourViewport(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(max-width: 767px)').matches
}

export function openBookmarksPanelIfClosed(): void {
  if (document.querySelector(tourSelectors.BOOKMARKS_PANEL)) return
  document.querySelector<HTMLElement>(tourSelectors.BOOKMARKS_TRIGGER)?.click()
}

export function closeBookmarksPanelIfOpen(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(GOSPEL_CLOSE_BOOKMARKS_PANEL_EVENT))
  document
    .querySelector<HTMLElement>('[data-bookmarks-dropdown-backdrop="true"]')
    ?.click()
  const trigger = document.querySelector<HTMLElement>(tourSelectors.BOOKMARKS_TRIGGER)
  if (trigger?.getAttribute('aria-expanded') === 'true') {
    trigger.click()
  }
}

export function openHighlightsPanelIfClosed(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(tourSelectors.PROFILE_HIGHLIGHTS_PANEL)) return
  document.querySelector<HTMLElement>(tourSelectors.PROFILE_HIGHLIGHTS_TRIGGER)?.click()
}

export function closeProfileResourceListenDialogIfOpen(): void {
  if (typeof document === 'undefined') return
  if (!document.querySelector(tourSelectors.PROFILE_RESOURCE_LISTEN_DIALOG)) return
  document.querySelector<HTMLElement>(tourSelectors.MEMORIZE_LISTEN_CLOSE)?.click()
}

export function closeProfileSlideoutMenuIfOpen(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(GOSPEL_CLOSE_PROFILE_SLIDEOUT_MENU_EVENT))
  if (document.querySelector(tourSelectors.PROFILE_SLIDEOUT_MENU)) {
    document.querySelector<HTMLElement>(tourSelectors.PROFILE_MENU_BUTTON)?.click()
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
export function scrollBookmarkTourSampleIntoView(): void {
  const subsection = querySecondPresentationSubsection()
  if (subsection?.id) {
    scrollToTocAnchor(subsection.id, {
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    })
    return
  }
  scrollPresentationSecondListItemIntoView()
}

export function queryBookmarkTourScrollTarget(): HTMLElement | null {
  return querySecondPresentationSubsection() ?? querySecondPresentationListItem()
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** driver.js normally removes these on destroy; clear defensively so ProfileContent menu hover-close is not stuck after a tour. */
export function clearDriverBodyClasses(): void {
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
export function createProfileHelpDriver(config: Config): Driver {
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
export function tourMotionConfig(): Pick<Config, 'animate' | 'smoothScroll'> {
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

export type ScriptureReaderTourResumePayloadV1 = {
  v: 1
  captiveForTour: boolean
  /** When set, full walkthrough continues at this segment index after the scripture tour ends. */
  continueFullWalkthroughAt?: number
  segmentIntro?: ProfileFeatureTourOptions['segmentIntro']
}

export function prependSegmentIntroIfAny(
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
        align: 'center',
      },
    },
    ...steps,
  ]
}

function escapeForPopoverText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function profileHelpRefreshDriverConfig(drv: Driver, patch: Partial<Config>): void {
  drv.setConfig({ ...drv.getConfig(), ...patch })
  window.requestAnimationFrame(() => drv.refresh())
}

export function baseProfileHelpDriverConfig(options?: ProfileFeatureTourOptions): Omit<Config, 'steps'> {
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
