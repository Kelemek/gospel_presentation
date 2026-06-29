import { isBiblicalCounselingSecularMapProfile } from '@/lib/biblicalCounseling/biblicalCounselingReference'
import {
  extractSecularTermMapRowAnchorId,
  isSecularTermMapTableDataRowHtml,
  isSecularTermMapTableHtml,
  lookupSecularTermMap,
  splitSecularTermMapIntroHtml,
  type SecularTermLookupResult,
  type SecularTermMapFile,
} from '@/lib/biblicalCounseling/secularTermMap'
import {
  kindleReadNestedId,
  kindleReadSectionId,
  kindleReadSubsectionId,
} from '@/lib/kindleReadHtml'
import type { KindleReadTextSize } from '@/lib/kindleReadTextSizePreference'
import { findProfileResourceSearchMatches } from '@/lib/profileResourceInPageSearch'
import { stripHtmlTags } from '@/lib/stripHtmlTags'
import type { BibleTranslation } from '@/lib/bible-translations'
import type { GospelPresentationData, NestedSubsection, Subsection } from '@/lib/types'

export const KINDLE_READ_RESOURCE_SEARCH_MIN_LENGTH = 3
export const KINDLE_READ_RESOURCE_SEARCH_PAGE_SIZE = 20

const SNIPPET_CONTEXT_CHARS = 48

export type KindleReadResourceSearchBlock = {
  anchorId: string
  breadcrumb: string
  plainText: string
}

export type KindleReadResourceSearchHit = {
  anchorId: string
  breadcrumb: string
  snippet: string
}

export type KindleReadResourceSearchResult = {
  query: string
  hits: KindleReadResourceSearchHit[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  mappingHint: SecularTermLookupResult | null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function plainFromHtml(html: string | undefined): string {
  if (!html?.trim()) return ''
  return stripHtmlTags(html).replace(/\s+/g, ' ').trim()
}

function pushBlock(
  blocks: KindleReadResourceSearchBlock[],
  anchorId: string,
  breadcrumb: string,
  plainText: string
): void {
  const text = plainText.trim()
  if (!text) return
  blocks.push({ anchorId, breadcrumb, plainText: text })
}

function pushExternalLinks(
  blocks: KindleReadResourceSearchBlock[],
  links: Subsection['externalResourceLinks'] | NestedSubsection['externalResourceLinks'],
  anchorId: string,
  breadcrumb: string
): void {
  for (const link of links ?? []) {
    const label = link.label?.trim()
    if (label) {
      pushBlock(blocks, anchorId, breadcrumb, label)
    }
  }
}

function pushQuestions(
  blocks: KindleReadResourceSearchBlock[],
  questions: Subsection['questions'] | NestedSubsection['questions'],
  anchorId: string,
  breadcrumb: string
): void {
  for (const question of questions ?? []) {
    const text = plainFromHtml(question.question)
    if (text) {
      pushBlock(blocks, anchorId, breadcrumb, text)
    }
  }
}

function pushNestedSubsections(
  blocks: KindleReadResourceSearchBlock[],
  nestedSubsections: NestedSubsection[] | undefined,
  sectionKey: string,
  subsectionIndex: number,
  sectionTitle: string,
  subsectionTitle: string
): void {
  for (const [nestedIndex, nested] of (nestedSubsections ?? []).entries()) {
    const nestedId = kindleReadNestedId(sectionKey, subsectionIndex, nestedIndex)
    const nestedTitle = plainFromHtml(nested.title)
    const breadcrumb = [sectionTitle, subsectionTitle, nestedTitle].filter(Boolean).join(' › ')
    if (nestedTitle) {
      pushBlock(blocks, nestedId, breadcrumb, nestedTitle)
    }
    const content = plainFromHtml(nested.content)
    if (content) {
      pushBlock(blocks, nestedId, breadcrumb, content)
    }
    pushExternalLinks(blocks, nested.externalResourceLinks, nestedId, breadcrumb)
    pushQuestions(blocks, nested.questions, nestedId, breadcrumb)
  }
}

function pushSecularTermMapTableBlocks(
  blocks: KindleReadResourceSearchBlock[],
  contentHtml: string,
  subsectionId: string,
  breadcrumb: string
): void {
  const { introHtml, tableHtml } = splitSecularTermMapIntroHtml(contentHtml)
  const introText = plainFromHtml(introHtml)
  if (introText) {
    pushBlock(blocks, subsectionId, breadcrumb, introText)
  }

  const tbodyMatch = /<tbody>([\s\S]*?)<\/tbody>/i.exec(tableHtml || contentHtml)
  const tbodyInner = tbodyMatch?.[1] ?? ''
  const rowRe = /<tr(\s[^>]*)?>([\s\S]*?)<\/tr>/gi
  let rowIndex = 0
  let match: RegExpExecArray | null
  while ((match = rowRe.exec(tbodyInner)) !== null) {
    const rowHtml = match[0]
    if (!isSecularTermMapTableDataRowHtml(rowHtml)) continue
    const rowId = extractSecularTermMapRowAnchorId(rowHtml, rowIndex)
    rowIndex += 1
    const rowText = plainFromHtml(rowHtml)
    if (rowText) {
      pushBlock(blocks, rowId, breadcrumb, rowText)
    }
  }
}

function pushSubsectionContentBlocks(
  blocks: KindleReadResourceSearchBlock[],
  contentHtml: string | undefined,
  subsectionId: string,
  breadcrumb: string
): void {
  if (!contentHtml?.trim()) return
  if (isSecularTermMapTableHtml(contentHtml)) {
    pushSecularTermMapTableBlocks(blocks, contentHtml, subsectionId, breadcrumb)
    return
  }
  const content = plainFromHtml(contentHtml)
  if (content) {
    pushBlock(blocks, subsectionId, breadcrumb, content)
  }
}

function pushSubsections(
  blocks: KindleReadResourceSearchBlock[],
  subsections: Subsection[],
  sectionKey: string,
  sectionTitle: string
): void {
  for (const [subsectionIndex, subsection] of subsections.entries()) {
    const subsectionId = kindleReadSubsectionId(sectionKey, subsectionIndex)
    const subsectionTitle = plainFromHtml(subsection.title)
    const breadcrumb = [sectionTitle, subsectionTitle].filter(Boolean).join(' › ')
    if (subsectionTitle) {
      pushBlock(blocks, subsectionId, breadcrumb, subsectionTitle)
    }
    pushSubsectionContentBlocks(blocks, subsection.content, subsectionId, breadcrumb)
    pushExternalLinks(blocks, subsection.externalResourceLinks, subsectionId, breadcrumb)
    pushQuestions(blocks, subsection.questions, subsectionId, breadcrumb)
    pushNestedSubsections(
      blocks,
      subsection.nestedSubsections,
      sectionKey,
      subsectionIndex,
      sectionTitle,
      subsectionTitle
    )
  }
}

/** Searchable text blocks aligned with Kindle read anchor ids. */
export function buildKindleReadResourceSearchBlocks(
  sections: GospelPresentationData
): KindleReadResourceSearchBlock[] {
  const blocks: KindleReadResourceSearchBlock[] = []

  for (const section of sections ?? []) {
    const sectionKey = String(section.section)
    const sectionId = kindleReadSectionId(sectionKey)
    const sectionTitle = plainFromHtml(section.title)
    if (sectionTitle) {
      pushBlock(blocks, sectionId, sectionTitle, sectionTitle)
    }
    if (section.linkDescription?.trim()) {
      pushBlock(blocks, sectionId, sectionTitle, section.linkDescription.trim())
    }
    pushSubsections(blocks, section.subsections ?? [], sectionKey, sectionTitle)
  }

  return blocks
}

function buildSnippet(plainText: string, start: number, end: number): string {
  const before = Math.max(0, start - SNIPPET_CONTEXT_CHARS)
  const after = Math.min(plainText.length, end + SNIPPET_CONTEXT_CHARS)
  let snippet = plainText.slice(before, after).trim()
  if (before > 0) snippet = `…${snippet}`
  if (after < plainText.length) snippet = `${snippet}…`
  return snippet
}

function isPinnedSecularMapSearchHit(anchorId: string, pinnedSectionId: string): boolean {
  return (
    anchorId === pinnedSectionId ||
    anchorId.startsWith(`${pinnedSectionId}-`) ||
    anchorId.startsWith('secular-term-map-row-')
  )
}

function prioritizeSecularMapHits(
  hits: KindleReadResourceSearchHit[],
  pinnedSectionId: string
): KindleReadResourceSearchHit[] {
  if (hits.length <= 1) return hits
  return [...hits].sort((a, b) => {
    const aPinned = isPinnedSecularMapSearchHit(a.anchorId, pinnedSectionId)
    const bPinned = isPinnedSecularMapSearchHit(b.anchorId, pinnedSectionId)
    if (aPinned === bPinned) return 0
    return aPinned ? -1 : 1
  })
}

/** Case-insensitive matches across profile blocks (min length enforced by caller). */
export function searchKindleReadResourceBlocks(
  blocks: KindleReadResourceSearchBlock[],
  query: string,
  options?: {
    profileSlug?: string | null
    secularTermMap?: SecularTermMapFile
    pinnedSectionId?: string
  }
): KindleReadResourceSearchHit[] {
  const needle = query.trim()
  if (!needle) return []

  const hits: KindleReadResourceSearchHit[] = []
  for (const block of blocks) {
    const ranges = findProfileResourceSearchMatches(block.plainText, needle)
    for (const range of ranges) {
      hits.push({
        anchorId: block.anchorId,
        breadcrumb: block.breadcrumb,
        snippet: buildSnippet(block.plainText, range.start, range.end),
      })
    }
  }

  if (isBiblicalCounselingSecularMapProfile(options?.profileSlug)) {
    const pinned = options?.pinnedSectionId ?? 'section-1'
    return prioritizeSecularMapHits(hits, pinned)
  }
  return hits
}

export function paginateKindleReadResourceSearchHits(
  hits: KindleReadResourceSearchHit[],
  page: number,
  pageSize = KINDLE_READ_RESOURCE_SEARCH_PAGE_SIZE
): { hits: KindleReadResourceSearchHit[]; total: number; page: number; totalPages: number } {
  const total = hits.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    hits: hits.slice(start, start + pageSize),
    total,
    page: safePage,
    totalPages,
  }
}

export function runKindleReadResourceSearch(
  sections: GospelPresentationData,
  query: string,
  page: number,
  options?: {
    profileSlug?: string | null
    secularTermMap?: SecularTermMapFile
  }
): KindleReadResourceSearchResult | null {
  const trimmed = query.trim()
  if (trimmed.length < KINDLE_READ_RESOURCE_SEARCH_MIN_LENGTH) {
    return null
  }

  const blocks = buildKindleReadResourceSearchBlocks(sections)
  const allHits = searchKindleReadResourceBlocks(blocks, trimmed, options)
  const paged = paginateKindleReadResourceSearchHits(allHits, page)

  const mappingHint = isBiblicalCounselingSecularMapProfile(options?.profileSlug)
    ? lookupSecularTermMap(trimmed, options?.secularTermMap)
    : null

  return {
    query: trimmed,
    hits: paged.hits,
    total: paged.total,
    page: paged.page,
    pageSize: KINDLE_READ_RESOURCE_SEARCH_PAGE_SIZE,
    totalPages: paged.totalPages,
    mappingHint: mappingHint && paged.total > 0 ? mappingHint : null,
  }
}

export function kindleReadResourceSearchPageUrl(
  slug: string,
  query: string,
  page = 1,
  options?: {
    translation?: BibleTranslation
    textSize?: KindleReadTextSize
  }
): string {
  const base = `/${encodeURIComponent(slug)}/read/`
  const params = new URLSearchParams()
  const trimmed = query.trim()
  if (trimmed) {
    params.set('q', trimmed)
  }
  if (page > 1) {
    params.set('page', String(page))
  }
  const translation = options?.translation?.trim().toLowerCase()
  if (translation && translation !== 'esv') {
    params.set('translation', translation)
  }
  const textSize = options?.textSize
  if (textSize && textSize !== 'normal') {
    params.set('textSize', textSize)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/** Jump link for a search hit: same read page without ?q= so results do not cover the target row. */
export function kindleReadResourceSearchHitUrl(
  slug: string,
  anchorId: string,
  options?: {
    translation?: BibleTranslation
    textSize?: KindleReadTextSize
  }
): string {
  return `${kindleReadResourceSearchPageUrl(slug, '', 1, options)}#${anchorId}`
}

export function renderKindleReadResourceSearchFormHtml(
  slug: string,
  query: string,
  translation: BibleTranslation,
  textSize: KindleReadTextSize
): string {
  const action = `/${encodeURIComponent(slug)}/read/`
  const translationHidden =
    translation !== 'esv'
      ? `<input type="hidden" name="translation" value="${escapeHtml(translation)}" />`
      : ''
  const textSizeHidden =
    textSize !== 'normal'
      ? `<input type="hidden" name="textSize" value="${escapeHtml(textSize)}" />`
      : ''

  return `<form class="kindle-read-resource-search" method="get" action="${escapeHtml(action)}">
    <label class="kindle-read-resource-search-label">
      <span class="kindle-read-resource-search-heading">Search this resource</span>
      <input
        class="kindle-read-resource-search-input"
        type="search"
        name="q"
        value="${escapeHtml(query)}"
        autocomplete="off"
        minlength="${KINDLE_READ_RESOURCE_SEARCH_MIN_LENGTH}"
      />
    </label>
    ${translationHidden}
    ${textSizeHidden}
    <p class="kindle-read-resource-search-actions">
      <button type="submit" class="kindle-read-resource-search-submit">Search</button>
    </p>
  </form>`
}

export function renderKindleReadResourceSearchResultsHtml(
  slug: string,
  result: KindleReadResourceSearchResult,
  translation: BibleTranslation,
  textSize: KindleReadTextSize
): string {
  const { query, hits, total, page, totalPages, mappingHint } = result
  const clearHref = escapeHtml(kindleReadResourceSearchPageUrl(slug, '', 1, { translation, textSize }))

  const mappingBlock = mappingHint
    ? `<p class="kindle-read-resource-search-mapping">Secular term → <span class="kindle-read-resource-search-mapping-topic">${escapeHtml(mappingHint.biblicalTopic)}</span></p>`
    : ''

  const hitItems =
    hits.length > 0
      ? hits
          .map((hit) => {
            const href = escapeHtml(
              kindleReadResourceSearchHitUrl(slug, hit.anchorId, { translation, textSize })
            )
            return `<li class="kindle-read-resource-search-hit">
              <a class="kindle-read-resource-search-hit-link" href="${href}">
                <span class="kindle-read-resource-search-hit-breadcrumb">${escapeHtml(hit.breadcrumb)}</span>
                <span class="kindle-read-resource-search-hit-snippet">${escapeHtml(hit.snippet)}</span>
              </a>
            </li>`
          })
          .join('')
      : '<li class="kindle-read-resource-search-empty">No matches in this resource.</li>'

  const prev =
    page > 1
      ? `<p class="kindle-read-resource-search-pager"><a href="${escapeHtml(kindleReadResourceSearchPageUrl(slug, query, page - 1, { translation, textSize }))}">Previous page</a></p>`
      : ''
  const next =
    page < totalPages
      ? `<p class="kindle-read-resource-search-pager"><a href="${escapeHtml(kindleReadResourceSearchPageUrl(slug, query, page + 1, { translation, textSize }))}">Next page</a></p>`
      : ''

  const countLabel =
    total === 0 ? 'No matches' : total === 1 ? '1 match' : `${total} matches`

  return `<section class="kindle-read-resource-search-results" aria-label="Search results">
    <h2 class="kindle-read-resource-search-results-title">Search results</h2>
    <p class="kindle-read-resource-search-results-query">Results for &ldquo;${escapeHtml(query)}&rdquo; (${countLabel})</p>
    <p class="kindle-read-resource-search-clear"><a href="${clearHref}">Clear search</a></p>
    ${mappingBlock}
    ${prev}
    <ul class="kindle-read-resource-search-hit-list">${hitItems}</ul>
    ${next}
    ${totalPages > 1 ? `<p class="kindle-read-resource-search-page-label">Page ${page} of ${totalPages}</p>` : ''}
  </section>`
}
