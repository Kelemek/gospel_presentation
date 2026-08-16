import { Capacitor } from '@capacitor/core'
import type { Driver } from 'driver.js'
import type { PublicResourceItem } from '@/lib/supabase-data-service'
import { loadPublicResourcesMenuItems } from '@/lib/publicResourcesMenuClient'
import {
  groupPublicResourceItems,
  publicResourceItemsForResourcesMenu,
  resolveBibleReaderMenuTitle,
} from '@/lib/groupPublicResourceItems'
import { loadMemorizedVerses } from '@/lib/verseMemorizationStorage'
import * as tourSelectors from './tourSharedSelectors'
import { sleep } from './tourSharedDriver'

export async function waitUntil(
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

export function openProfileMenuIfClosed(): void {
  if (document.querySelector(tourSelectors.PROFILE_SLIDEOUT_MENU)) return
  document.querySelector<HTMLElement>(tourSelectors.PROFILE_MENU_BUTTON)?.click()
}

export function openMemorizePanelIfCollapsed(): void {
  if (document.querySelector(tourSelectors.MEMORIZE_PANEL)) return
  document.querySelector<HTMLElement>(tourSelectors.TOC_MEMORIZE_TOGGLE)?.click()
}

/** Dismiss the Add Memorized Verse picker by sending Escape (its window keydown listener closes on Escape). */
export function closeAddMemorizeModalIfOpen(): void {
  if (typeof document === 'undefined') return
  if (!document.querySelector(tourSelectors.ADD_MEMORIZE_MODAL)) return
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
}

/** After closing the practice modal, restore Menu → Memorize for the remove step. */
export async function reopenMemorizeMenuAndPanelForTour(): Promise<void> {
  openProfileMenuIfClosed()
  await waitUntil(() => document.querySelector(tourSelectors.PROFILE_SLIDEOUT_MENU) != null, 4000)
  await sleep(200)
  openMemorizePanelIfCollapsed()
  await waitUntil(() => document.querySelector(tourSelectors.MEMORIZE_PANEL) != null, 4000)
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

export async function selectFirstCompareTranslationOptionAsync(): Promise<boolean> {
  const trigger = document.querySelector<HTMLButtonElement>(tourSelectors.SCRIPTURE_MODAL_COMPARE)
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

export async function clearCompareTranslationSelectAsync(): Promise<void> {
  const trigger = document.querySelector<HTMLButtonElement>(tourSelectors.SCRIPTURE_MODAL_COMPARE)
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

export function modalVerseBodyHasText(): boolean {
  const el = document.querySelector(tourSelectors.SCRIPTURE_MODAL_VERSE_BODY)
  if (!el) return false
  const t = (el.textContent ?? '').replace(/\s/g, '')
  return t.length > 20
}

export function getScriptureModalReferenceFromDom(): string | null {
  const h3 = document.querySelector(`${tourSelectors.SCRIPTURE_MODAL_TOOLBAR} h3`) as HTMLElement | null
  return h3?.getAttribute('aria-label') ?? h3?.textContent?.trim() ?? null
}

/** After adding (or when the verse was already saved), pick the verse row id for the memorization tour remove step. */
export function resolveMemorizeTourTargetVerseIdAfterAdd(): string | null {
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

export function compareColumnsVisible(): boolean {
  return !!document.querySelector(tourSelectors.SCRIPTURE_MODAL_COMPARE_COLUMNS)
}

export function modalSingleVerseViewReady(): boolean {
  return modalVerseBodyHasText() && !document.querySelector(tourSelectors.SCRIPTURE_MODAL_CHAPTER_BODY)
}

function wordStudyToolbarButton(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>(tourSelectors.SCRIPTURE_MODAL_WORD_STUDY)
}

function wordStudyOverlayOpen(): boolean {
  return !!document.querySelector(tourSelectors.SCRIPTURE_MODAL_WORD_STUDY_OVERLAY)
}

export function firstWordStudyChipButton(): HTMLButtonElement | null {
  const panel = document.querySelector(tourSelectors.SCRIPTURE_MODAL_WORD_STUDY_PANEL)
  return panel?.querySelector<HTMLButtonElement>('ul button[type="button"]') ?? null
}

export function wordStudyLexiconHasEntryBody(): boolean {
  const sheet = document.querySelector(tourSelectors.SCRIPTURE_MODAL_WORD_STUDY_LEXICON)
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
  const toggle = document.querySelector<HTMLButtonElement>(tourSelectors.SCRIPTURE_MODAL_VERSE_CHAPTER_TOGGLE)
  if (toggle?.textContent?.trim() === 'Verse') {
    toggle.click()
    return waitUntil(() => modalSingleVerseViewReady(), 12000).then(() => undefined)
  }
  return Promise.resolve()
}

export function openWordStudyOverlayForTour(): Promise<void> {
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
export function escapeForPopoverText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function resourcesListPanelReady(panel: Element): boolean {
  if (panel.getAttribute('data-resources-loaded') !== 'true') return false
  const t = panel.textContent ?? ''
  if (t.includes('No resources available')) return true
  if (panel.querySelector(tourSelectors.RESOURCE_CATEGORY)) return true
  if (panel.querySelector('[data-resource-spurgeon-library]')) return true
  if (panel.querySelector('[data-resource-calvin-library]')) return true
  if (panel.querySelector('a[href^="/"]')) return true
  return false
}

export async function fetchPublicResourceItemsForTour(): Promise<PublicResourceItem[]> {
  try {
    return await loadPublicResourcesMenuItems()
  } catch {
    return []
  }
}

export function resourcesListOverviewCopy(items: PublicResourceItem[]): string {
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

export function resourceTemplatesBlockTitle(count: number): string {
  return count === 1 ? 'Top-level resource' : 'Top-level resources'
}

export function resourceTemplatesBlockDescription(
  templates: Extract<PublicResourceItem, { type: 'template' }>[]
): string {
  const titles = templates.map((t) => escapeForPopoverText(t.title.trim() || t.slug))
  const list = titles.map((t) => `<li><strong>${t}</strong></li>`).join('')
  if (templates.length === 1) {
    return `<p>This link sits at the top level (not inside a folder). It opens a shared gospel profile your church published.</p><ul class="list-disc pl-5 mt-2 text-sm">${list}</ul><p class="mt-2">Tap it when you want to open that presentation.</p>`
  }
  return `<p>These links sit at the top level (not inside a folder). Each opens a shared gospel profile your church published.</p><ul class="list-disc pl-5 mt-2 text-sm">${list}</ul><p class="mt-2">Tap any link when you want to open that presentation.</p>`
}

export function resourceCategoryBlockDescription(cat: Extract<PublicResourceItem, { type: 'category' }>): string {
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
export function escapeAttrSelectorValue(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

export function expandResourceCategoryIfCollapsed(categoryId: string, drv: Pick<Driver, 'refresh'>): void {
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

export function scriptureHoverPreviewTourIntroDescription(): string {
  const how =
    '<p><strong>Desktop:</strong> with a mouse, <strong>hover</strong> over a scripture reference in the paragraph text (the pill-style link) for a couple of seconds. <strong>Phone or native app:</strong> <strong>press and hold</strong> for about half a second—touchscreens have no hover. Either way, a small card appears with verse text without opening the full reader.</p>'
  return `${how}${scriptureHoverPreviewDemoVisualsHtml(isTouchOnlyScripturePreview())}`
}

export function findCategoryIdForTemplateSlug(items: PublicResourceItem[], slug: string): string | null {
  for (const i of items) {
    if (i.type === 'category' && i.children.some((c) => c.type === 'template' && c.slug === slug)) return i.id
  }
  return null
}

export function templateSlugInTopLevelBlocks(items: PublicResourceItem[], slug: string): boolean {
  for (const g of groupPublicResourceItems(items)) {
    if (g.kind === 'templates' && g.items.some((t) => t.slug === slug)) return true
  }
  return false
}

export function queryHomeworkSectionHeading(): HTMLElement | null {
  const headings = document.querySelectorAll<HTMLElement>('main.container h3.print-section-header')
  for (const h of headings) {
    const text = (h.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (text.startsWith('Homework')) return h
  }
  return null
}

const PROFILE_QUESTION_BLOCK = '[data-tour="profile-question-block"]'
const PROFILE_SAVE_ANSWER = '[data-tour="profile-save-answer"]'

export function queryHomeworkSectionElement(): HTMLElement | null {
  const h = queryHomeworkSectionHeading()
  return h?.closest('section[id]') ?? null
}

export function queryHomeworkFirstQuestionBlock(): HTMLElement | null {
  return queryHomeworkSectionElement()?.querySelector<HTMLElement>(PROFILE_QUESTION_BLOCK) ?? null
}

export function queryHomeworkFirstSaveAnswerButton(): HTMLElement | null {
  return queryHomeworkSectionElement()?.querySelector<HTMLElement>(PROFILE_SAVE_ANSWER) ?? null
}

/** Marriage seminar: first blue card can mirror the video link; tour spotlights the next scripture card. */
export function queryMarriageSeminarScriptureCardForTour(): HTMLElement | null {
  const cards = document.querySelectorAll<HTMLElement>('main.container [data-tour="scripture-card"]')
  if (cards.length >= 2) return cards[1] ?? null
  return cards[0] ?? null
}

export function isMarriageSeminarProfilePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/'
  return p === '/marriagechapter1' || p.endsWith('/marriagechapter1')
}

export function isDefaultProfilePath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '') || '/'
  return p === '/default' || p.endsWith('/default')
}

export function buildMarriageSeminarResourceLinkSelector(): string {
  return `${tourSelectors.RESOURCES_LIST_PANEL} a[data-resource-template-slug="${escapeAttrSelectorValue('marriagechapter1')}"]`
}

