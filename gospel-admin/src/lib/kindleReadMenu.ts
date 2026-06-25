import { renderKindleReadTocMenuInnerHtml } from '@/lib/kindleReadHtml'
import { renderKindleReadResourcesMenuInnerHtml } from '@/lib/kindleReadResources'
import type { EnabledTranslationOption } from '@/lib/enabledTranslationCodes'
import type { BibleTranslation } from '@/lib/bible-translations'
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

/** Combined Menu: Resources, Bible Translation, Text size, then Table of Contents (native <details>). */
export function renderKindleReadMenuNavHtml(
  resourceItems: PublicResourceItem[],
  sections: GospelPresentationData,
  fromSlug: string,
  translationOptions: EnabledTranslationOption[],
  currentTranslation: BibleTranslation,
  currentTextSize: KindleReadTextSize
): string {
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
  if (!resourcesInner && !translationInner && !textSizeInner && !tocInner) return ''

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

  return `<details class="kindle-read-menu">
    <summary class="kindle-read-menu-title">Menu</summary>
    <div class="kindle-read-menu-body">
      ${resourcesBlock}
      ${translationBlock}
      ${textSizeBlock}
      ${tocBlock}
    </div>
  </details>`
}
