import { renderKindleReadTocMenuInnerHtml } from '@/lib/kindleReadHtml'
import { renderKindleReadResourceSearchFormHtml } from '@/lib/kindleReadResourceSearch'
import { renderKindleReadResourcesMenuInnerHtml } from '@/lib/kindleReadResources'
import type { EnabledTranslationOption } from '@/lib/enabledTranslationCodes'
import type { BibleTranslation } from '@/lib/bible-translations'
import { KINDLE_READ_MENU_PANEL_ID } from '@/lib/kindleReadMenuConstants'
import {
  kindleReadTranslationSwitchUrl,
  shortTranslationMenuLabel,
} from '@/lib/kindleReadTranslationPreference'
import {
  KINDLE_READ_TEXT_SIZE_MENU_OPTIONS,
  kindleReadTextSizeSwitchUrl,
  type KindleReadTextSize,
} from '@/lib/kindleReadTextSizePreference'
import type { PublicResourceItem } from '@/lib/supabase-data-service'
import type { GospelPresentationData } from '@/lib/types'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Inner translation picker HTML (no outer <details>; plain links, no JavaScript). */
export function renderKindleReadTranslationMenuInnerHtml(
  options: EnabledTranslationOption[],
  currentTranslation: BibleTranslation,
  fromSlug: string,
  currentTextSize?: KindleReadTextSize
): string {
  if (options.length <= 1) return ''

  const items = options
    .map((option) => {
      const code = option.translation_code as BibleTranslation
      const label = escapeHtml(shortTranslationMenuLabel(option.translation_name, code))
      if (code === currentTranslation) {
        return `<li class="kindle-read-translation-item"><span class="kindle-read-translation-option kindle-read-translation-option--current" aria-current="true">${label}</span></li>`
      }
      const href = escapeHtml(kindleReadTranslationSwitchUrl(fromSlug, code, currentTextSize))
      return `<li class="kindle-read-translation-item"><a class="kindle-read-translation-option" href="${href}">${label}</a></li>`
    })
    .join('')

  return `<ul class="kindle-read-translation-list">${items}</ul>`
}

/** Inner text size picker HTML (no outer <details>; plain links, no JavaScript). */
export function renderKindleReadTextSizeMenuInnerHtml(
  fromSlug: string,
  currentTextSize: KindleReadTextSize,
  currentTranslation: BibleTranslation
): string {
  const items = KINDLE_READ_TEXT_SIZE_MENU_OPTIONS.map((option) => {
    const label = escapeHtml(option.label)
    if (option.value === currentTextSize) {
      return `<li class="kindle-read-translation-item"><span class="kindle-read-translation-option kindle-read-translation-option--current" aria-current="true">${label}</span></li>`
    }
    const href = escapeHtml(
      kindleReadTextSizeSwitchUrl(fromSlug, option.value, currentTranslation)
    )
    return `<li class="kindle-read-translation-item"><a class="kindle-read-translation-option" href="${href}">${label}</a></li>`
  }).join('')

  return `<ul class="kindle-read-translation-list">${items}</ul>`
}

export { KINDLE_READ_MENU_PANEL_ID } from '@/lib/kindleReadMenuConstants'

export interface KindleReadMenuHtml {
  triggerHtml: string
  panelHtml: string
}

function renderKindleReadMenuBodySectionsHtml(
  resourceItems: PublicResourceItem[],
  sections: GospelPresentationData,
  fromSlug: string,
  translationOptions: EnabledTranslationOption[],
  currentTranslation: BibleTranslation,
  currentTextSize: KindleReadTextSize,
  searchQuery = ''
): string {
  const searchInner = renderKindleReadResourceSearchFormHtml(
    fromSlug,
    searchQuery,
    currentTranslation,
    currentTextSize
  )
  const resourcesInner = renderKindleReadResourcesMenuInnerHtml(resourceItems, fromSlug)
  const translationInner = renderKindleReadTranslationMenuInnerHtml(
    translationOptions,
    currentTranslation,
    fromSlug,
    currentTextSize
  )
  const textSizeInner = renderKindleReadTextSizeMenuInnerHtml(
    fromSlug,
    currentTextSize,
    currentTranslation
  )
  const tocInner = renderKindleReadTocMenuInnerHtml(sections)

  const searchBlock = `<details class="kindle-read-menu-section">
        <summary class="kindle-read-menu-section-title">Search</summary>
        <div class="kindle-read-menu-search">${searchInner}</div>
      </details>`

  const resourcesBlock = resourcesInner
    ? `<details class="kindle-read-menu-section">
        <summary class="kindle-read-menu-section-title">Resources</summary>
        <div class="kindle-read-menu-resources">${resourcesInner}</div>
      </details>`
    : ''

  const translationBlock = translationInner
    ? `<details class="kindle-read-menu-section">
        <summary class="kindle-read-menu-section-title">Bible Translation</summary>
        <div class="kindle-read-menu-translations">${translationInner}</div>
      </details>`
    : ''

  const textSizeBlock = textSizeInner
    ? `<details class="kindle-read-menu-section">
        <summary class="kindle-read-menu-section-title">Text size</summary>
        <div class="kindle-read-menu-text-size">${textSizeInner}</div>
      </details>`
    : ''

  const tocBlock = tocInner
    ? `<details class="kindle-read-menu-section">
        <summary class="kindle-read-menu-section-title">Table of Contents</summary>
        <div class="kindle-read-menu-toc">${tocInner}</div>
      </details>`
    : ''

  return `${searchBlock}${resourcesBlock}${translationBlock}${textSizeBlock}${tocBlock}`
}

/** Sticky-toolbar Menu button (panel is a sibling below the toolbar; toggled via script on Silk). */
export function renderKindleReadMenuTriggerHtml(): string {
  return `<div class="kindle-read-menu-trigger">
    <button type="button" class="kindle-read-menu-title kindle-read-menu-trigger-btn" aria-expanded="false" aria-controls="${KINDLE_READ_MENU_PANEL_ID}">Menu</button>
  </div>`
}

/** Scrollable menu panel for profile read pages (not inside the sticky toolbar). */
export function renderKindleReadMenuPanelHtml(bodySectionsHtml: string): string {
  if (!bodySectionsHtml) return ''
  return `<div id="${KINDLE_READ_MENU_PANEL_ID}" class="kindle-read-menu-panel"><div class="kindle-read-menu-body">${bodySectionsHtml}</div></div>`
}

/** Split Menu for profile read: trigger in sticky bar, panel scrolls below. */
export function renderKindleReadMenuHtml(
  resourceItems: PublicResourceItem[],
  sections: GospelPresentationData,
  fromSlug: string,
  translationOptions: EnabledTranslationOption[],
  currentTranslation: BibleTranslation,
  currentTextSize: KindleReadTextSize,
  searchQuery = ''
): KindleReadMenuHtml | null {
  const bodySectionsHtml = renderKindleReadMenuBodySectionsHtml(
    resourceItems,
    sections,
    fromSlug,
    translationOptions,
    currentTranslation,
    currentTextSize,
    searchQuery
  )
  if (!bodySectionsHtml) return null

  return {
    triggerHtml: renderKindleReadMenuTriggerHtml(),
    panelHtml: renderKindleReadMenuPanelHtml(bodySectionsHtml),
  }
}

/** Combined Menu: Search, Resources, Bible Translation, Text size, then Table of Contents (native <details>). */
export function renderKindleReadMenuNavHtml(
  resourceItems: PublicResourceItem[],
  sections: GospelPresentationData,
  fromSlug: string,
  translationOptions: EnabledTranslationOption[],
  currentTranslation: BibleTranslation,
  currentTextSize: KindleReadTextSize,
  searchQuery = ''
): string {
  const parts = renderKindleReadMenuHtml(
    resourceItems,
    sections,
    fromSlug,
    translationOptions,
    currentTranslation,
    currentTextSize,
    searchQuery
  )
  if (!parts) return ''

  return `${parts.triggerHtml}${parts.panelHtml}`
}
