import { segmentPlainTextForGospelInlines } from '@/lib/injectGospelInlineMarkersInHtml'
import { scanCanonicalScriptureSpansInPlainText } from '@/lib/scriptureReferenceNormalize'
import { stripHtmlTags } from '@/lib/stripHtmlTags'
import type { BibleTranslation } from '@/lib/bible-translations'
import { isBibleTranslation } from '@/lib/bible-translations'
import type {
  GospelPresentationData,
  GospelSection,
  NestedSubsection,
  ScriptureReference,
  Subsection,
} from '@/lib/types'

export function kindleReadSectionId(sectionKey: string): string {
  return `section-${sectionKey}`
}

export function kindleReadSubsectionId(sectionKey: string, subsectionIndex: number): string {
  return `${kindleReadSectionId(sectionKey)}-${subsectionIndex}`
}

export function kindleReadNestedId(
  sectionKey: string,
  subsectionIndex: number,
  nestedIndex: number
): string {
  return `${kindleReadSubsectionId(sectionKey, subsectionIndex)}-${nestedIndex}`
}

export function kindleScriptureReadUrl(
  reference: string,
  fromSlug: string,
  anchor?: string,
  translation?: BibleTranslation
): string {
  const params = new URLSearchParams({
    ref: reference.trim(),
    from: fromSlug,
  })
  const anchorTrimmed = anchor?.trim()
  if (anchorTrimmed) {
    params.set('anchor', anchorTrimmed)
  }
  if (translation && translation !== 'esv' && isBibleTranslation(translation)) {
    params.set('translation', translation)
  }
  return `/read/scripture/?${params.toString()}`
}

export function kindleProfileReadUrl(slug: string): string {
  return `/${encodeURIComponent(slug)}/read/`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Decode entities in stored HTML text nodes before re-escaping for Kindle output. */
function decodeCommonHtmlEntitiesForKindleRead(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&#160;/g, '\u00a0')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
}

/**
 * Drop stored `<a>` tags so Kindle linkify does not double-wrap scripture.
 * Preserves same-page hash links (e.g. secular-term map → topic section).
 */
function stripAnchorsForKindleRead(html: string): string {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attrs: string, inner: string) => {
    const hrefMatch = /\bhref\s*=\s*["']#([^"']+)["']/i.exec(attrs)
    if (hrefMatch) {
      return `<a class="kindle-read-internal-link" href="#${hrefMatch[1]}">${inner}</a>`
    }
    return inner
  })
}

function htmlPlainTextForKindleRead(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Imported books inline scripture in body; skip duplicate scripture cards on Kindle. */
export function shouldRenderKindleReadScriptureCards(
  refs: ScriptureReference[] | undefined,
  contentHtml: string | undefined
): boolean {
  if (!refs?.length) return false
  if (!contentHtml?.trim()) return true
  const plain = htmlPlainTextForKindleRead(contentHtml)
  return scanCanonicalScriptureSpansInPlainText(plain).length === 0
}

function segmentsToLinkedHtml(
  segments: ReturnType<typeof segmentPlainTextForGospelInlines>,
  fromSlug: string,
  anchor: string | undefined,
  translation: BibleTranslation
): string {
  let out = ''
  for (const seg of segments) {
    switch (seg.kind) {
      case 'text':
        out += escapeHtml(decodeCommonHtmlEntitiesForKindleRead(seg.value))
        break
      case 'coma':
        out += escapeHtml(decodeCommonHtmlEntitiesForKindleRead(seg.label))
        break
      case 'fourRules':
        out += 'Four Rules of Communication'
        break
      case 'scripture':
        out += `<a class="kindle-read-scripture-link" href="${escapeHtml(kindleScriptureReadUrl(seg.cleanRef, fromSlug, anchor, translation))}">${escapeHtml(seg.cleanRef)}</a>`
        break
      default: {
        const _exhaustive: never = seg
        out += _exhaustive
      }
    }
  }
  return out
}

/** Link inline scripture in body HTML; assigns block ids so back links scroll to the paragraph. */
export function linkifyScriptureInBodyHtmlForKindleRead(
  html: string,
  fromSlug: string,
  anchorPrefix: string,
  translation: BibleTranslation = 'esv'
): string {
  if (!html) return ''
  const stripped = stripAnchorsForKindleRead(html)
  const blockOpenRe = /^<(p|li|blockquote|h[1-6]|td|th)(\s[^>]*)?>$/i
  const blockCloseRe = /^<\/(p|li|blockquote|h[1-6]|td|th)>$/i

  let blockIndex = 0
  let currentBlockId: string | undefined

  return stripped.replace(/(<[^>]*>)|([^<]+)/g, (match, tag: string | undefined, text: string | undefined) => {
    if (tag) {
      if (blockOpenRe.test(tag)) {
        const blockId = `${anchorPrefix}-b-${blockIndex++}`
        currentBlockId = blockId
        if (/\bid\s*=/.test(tag)) {
          return tag
        }
        return tag.replace(/^<(\w+)/, `<$1 id="${blockId}"`)
      }
      if (blockCloseRe.test(tag)) {
        currentBlockId = undefined
      }
      return tag
    }
    if (text) {
      const segments = segmentPlainTextForGospelInlines(text)
      return segmentsToLinkedHtml(segments, fromSlug, currentBlockId ?? anchorPrefix, translation)
    }
    return match
  })
}

/** Link inline scripture references in HTML text nodes (Kindle read mode; no JS). */
export function linkifyScriptureInHtmlForKindleRead(
  html: string,
  fromSlug: string,
  anchor?: string,
  translation: BibleTranslation = 'esv'
): string {
  if (!html) return ''
  const stripped = stripAnchorsForKindleRead(html)
  return stripped.replace(/(<[^>]*>)|([^<]+)/g, (match, tag: string | undefined, text: string | undefined) => {
    if (tag) return tag
    if (text) {
      const segments = segmentPlainTextForGospelInlines(text)
      return segmentsToLinkedHtml(segments, fromSlug, anchor, translation)
    }
    return match
  })
}

export function renderKindleReadScriptureCards(
  refs: ScriptureReference[] | undefined,
  fromSlug: string,
  contentHtml?: string,
  anchor?: string,
  translation: BibleTranslation = 'esv'
): string {
  if (!shouldRenderKindleReadScriptureCards(refs, contentHtml) || !refs?.length) return ''
  const items = refs
    .map((ref, cardIndex) => {
      const cardAnchor = anchor ? `${anchor}-card-${cardIndex}` : undefined
      const label = escapeHtml(ref.reference)
      const href = escapeHtml(kindleScriptureReadUrl(ref.reference, fromSlug, cardAnchor, translation))
      const text = ref.text
        ? `<span class="kindle-read-scripture-card-text">${escapeHtml(ref.text)}</span>`
        : ''
      const idAttr = cardAnchor ? ` id="${escapeHtml(cardAnchor)}"` : ''
      const withTextClass = ref.text ? ' kindle-read-scripture-card-with-text' : ''
      return `<span${idAttr} class="kindle-read-scripture-card${withTextClass}"><a class="kindle-read-scripture-link" href="${href}">${label}</a>${text}</span>`
    })
    .join('')
  return `<div class="kindle-read-scripture-cards">${items}</div>`
}

export function renderKindleReadQuestionsHtml(
  questions: NestedSubsection['questions'] | Subsection['questions'],
  fromSlug: string,
  anchor?: string,
  translation: BibleTranslation = 'esv'
): string {
  if (!questions?.length) return ''
  const items = questions
    .map((q, questionIndex) => {
      const questionAnchor = anchor ? `${anchor}-q-${questionIndex}` : undefined
      const questionHtml = linkifyScriptureInBodyHtmlForKindleRead(
        q.question,
        fromSlug,
        questionAnchor ?? 'question',
        translation
      )
      const idAttr = questionAnchor ? ` id="${escapeHtml(questionAnchor)}"` : ''
      return `<li${idAttr} class="kindle-read-question"><div class="kindle-read-question-text">${questionHtml}</div></li>`
    })
    .join('')
  return `<ol class="kindle-read-questions">${items}</ol>`
}

export function renderKindleReadNestedSubsectionHtml(
  nested: NestedSubsection,
  sectionKey: string,
  subsectionIndex: number,
  nestedIndex: number,
  fromSlug: string,
  translation: BibleTranslation = 'esv'
): string {
  const nestedId = kindleReadNestedId(sectionKey, subsectionIndex, nestedIndex)
  const title = linkifyScriptureInHtmlForKindleRead(nested.title, fromSlug, nestedId, translation)
  const content = nested.content
    ? `<div class="kindle-read-body">${linkifyScriptureInBodyHtmlForKindleRead(nested.content, fromSlug, nestedId, translation)}</div>`
    : ''
  const cards = renderKindleReadScriptureCards(
    nested.scriptureReferences,
    fromSlug,
    nested.content,
    nestedId,
    translation
  )
  const questions = renderKindleReadQuestionsHtml(nested.questions, fromSlug, nestedId, translation)
  return `<div id="${nestedId}" class="kindle-read-nested">
    <h5 class="kindle-read-nested-title">${title}</h5>
    ${content}
    ${cards}
    ${questions}
  </div>`
}

export function renderKindleReadSubsectionHtml(
  subsection: Subsection,
  sectionKey: string,
  subsectionIndex: number,
  fromSlug: string,
  translation: BibleTranslation = 'esv'
): string {
  const subsectionId = kindleReadSubsectionId(sectionKey, subsectionIndex)
  const title = linkifyScriptureInHtmlForKindleRead(subsection.title, fromSlug, subsectionId, translation)
  const content = subsection.content
    ? `<div class="kindle-read-body">${linkifyScriptureInBodyHtmlForKindleRead(subsection.content, fromSlug, subsectionId, translation)}</div>`
    : ''
  const cards = renderKindleReadScriptureCards(
    subsection.scriptureReferences,
    fromSlug,
    subsection.content,
    subsectionId,
    translation
  )
  const questions = renderKindleReadQuestionsHtml(subsection.questions, fromSlug, subsectionId, translation)
  const nested = (subsection.nestedSubsections ?? [])
    .map((nestedSub, nestedIndex) =>
      renderKindleReadNestedSubsectionHtml(
        nestedSub,
        sectionKey,
        subsectionIndex,
        nestedIndex,
        fromSlug,
        translation
      )
    )
    .join('')
  return `<div id="${subsectionId}" class="kindle-read-subsection">
    <h4 class="kindle-read-subsection-title">${title}</h4>
    ${content}
    ${cards}
    ${questions}
    ${nested ? `<div class="kindle-read-nested-group">${nested}</div>` : ''}
  </div>`
}

export function renderKindleReadSectionHtml(
  section: GospelSection,
  fromSlug: string,
  translation: BibleTranslation = 'esv'
): string {
  const sectionId = kindleReadSectionId(section.section)
  const title = linkifyScriptureInHtmlForKindleRead(section.title, fromSlug, sectionId, translation)
  const linkBlock =
    section.linkUrl && section.linkUrl.trim()
      ? `<p class="kindle-read-external-link"><a href="${escapeHtml(section.linkUrl)}">${escapeHtml(section.linkDescription || 'Visit link')}</a></p>`
      : ''
  const subsections = (section.subsections ?? [])
    .map((subsection, subsectionIndex) =>
      renderKindleReadSubsectionHtml(subsection, section.section, subsectionIndex, fromSlug, translation)
    )
    .join('')
  return `<section id="${sectionId}" class="kindle-read-section">
    <h3 class="kindle-read-section-title">${title}</h3>
    ${linkBlock}
    ${subsections}
  </section>`
}

export function renderKindleReadArticleHtml(
  sections: GospelPresentationData,
  fromSlug: string,
  translation: BibleTranslation = 'esv'
): string {
  return (sections ?? [])
    .map((section) => renderKindleReadSectionHtml(section, fromSlug, translation))
    .join('\n')
}

function kindleReadTocTitleBlank(title: string | undefined): boolean {
  return !stripHtmlTags(title ?? '').trim()
}

function kindleReadTocVisibleSubsections(section: GospelSection) {
  return section.subsections
    .map((subsection, index) => ({ subsection, index }))
    .filter(({ subsection }) => {
      const nestedSubsections =
        subsection.nestedSubsections?.filter((n) => !kindleReadTocTitleBlank(n.title)) ?? []
      const subsectionTitleBlank = kindleReadTocTitleBlank(subsection.title)
      return !subsectionTitleBlank || nestedSubsections.length > 0
    })
}

function kindleReadTocLinkHtml(label: string, anchorId: string): string {
  return `<li class="kindle-read-toc-item"><a href="#${escapeHtml(anchorId)}">${escapeHtml(label)}</a></li>`
}

function renderKindleReadTocSubsectionHtml(section: GospelSection, subsection: Subsection, index: number): string {
  const nestedSubsections =
    subsection.nestedSubsections?.filter((n) => !kindleReadTocTitleBlank(n.title)) ?? []
  const hasVisibleNested = nestedSubsections.length > 0
  const subsectionTitleBlank = kindleReadTocTitleBlank(subsection.title)
  if (subsectionTitleBlank && !hasVisibleNested) return ''

  const subsectionId = kindleReadSubsectionId(String(section.section), index)

  if (!hasVisibleNested) {
    if (subsectionTitleBlank) return ''
    return kindleReadTocLinkHtml(stripHtmlTags(subsection.title), subsectionId)
  }

  const subsectionTitle = subsectionTitleBlank ? 'More' : stripHtmlTags(subsection.title)
  const nestedLinks = nestedSubsections
    .map((nested) => {
      const originalNestedIndex = subsection.nestedSubsections!.indexOf(nested)
      const nestedId = kindleReadNestedId(String(section.section), index, originalNestedIndex)
      return kindleReadTocLinkHtml(stripHtmlTags(nested.title), nestedId)
    })
    .join('')
  const subsectionStartLink = subsectionTitleBlank
    ? ''
    : kindleReadTocLinkHtml(stripHtmlTags(subsection.title), subsectionId)

  return `<li class="kindle-read-toc-subsection-item">
    <details class="kindle-read-toc-subsection">
      <summary class="kindle-read-toc-subsection-name">${escapeHtml(subsectionTitle)}</summary>
      <ul class="kindle-read-toc-list">${subsectionStartLink}${nestedLinks}</ul>
    </details>
  </li>`
}

function renderKindleReadTocSectionHtml(section: GospelSection): string {
  const sectionId = kindleReadSectionId(String(section.section))
  const sectionTitle = stripHtmlTags(section.title)
  const subsectionEntries = kindleReadTocVisibleSubsections(section)

  if (subsectionEntries.length === 0) {
    return kindleReadTocLinkHtml(sectionTitle, sectionId)
  }

  const subsectionBlocks = subsectionEntries
    .map(({ subsection, index }) => renderKindleReadTocSubsectionHtml(section, subsection, index))
    .filter(Boolean)
    .join('')

  return `<li class="kindle-read-toc-section-item">
    <details class="kindle-read-toc-section">
      <summary class="kindle-read-toc-section-name">${escapeHtml(sectionTitle)}</summary>
      <ul class="kindle-read-toc-list">
        ${kindleReadTocLinkHtml(sectionTitle, sectionId)}
        ${subsectionBlocks}
      </ul>
    </details>
  </li>`
}

/** Inner TOC list HTML (no outer <details>; for combined Menu). */
export function renderKindleReadTocMenuInnerHtml(sections: GospelPresentationData): string {
  if (!sections?.length) return ''

  const items = sections.map((section) => renderKindleReadTocSectionHtml(section)).join('')
  if (!items) return ''

  return `<ul class="kindle-read-toc-list">${items}</ul>`
}

/** @deprecated Use renderKindleReadMenuNavHtml — standalone TOC dropdown. */
export function renderKindleReadTocNavHtml(sections: GospelPresentationData): string {
  const inner = renderKindleReadTocMenuInnerHtml(sections)
  if (!inner) return ''

  return `<details class="kindle-read-toc">
    <summary class="kindle-read-toc-title">Table of Contents</summary>
    <div class="kindle-read-toc-body">
      ${inner}
    </div>
  </details>`
}
