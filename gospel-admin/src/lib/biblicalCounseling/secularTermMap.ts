import type { GospelSection } from '@/lib/types'
import { sortGospelSectionsWithPinnedFirst } from '@/lib/gospelDataSections'

export const DEFAULT_PINNED_SECTION_TITLE = 'Find your topic (secular terms)'

export type SecularTermMapping = {
  secularTerms: string[]
  biblicalTopic: string
}

export type SecularTermMapFile = {
  pinnedSectionTitle: string
  introHtml: string
  mappings: SecularTermMapping[]
}

/** Used when Supabase has no map yet or the public API is unavailable. */
export const EMPTY_SECULAR_TERM_MAP: SecularTermMapFile = {
  pinnedSectionTitle: DEFAULT_PINNED_SECTION_TITLE,
  introHtml: '',
  mappings: [],
}

/** Collapse whitespace and lowercase for lookup. */
export function normalizeSecularTerm(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, ' ')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Split comma- or line-separated secular terms; trim and drop empties. */
export function parseSecularTermsInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((term) => term.trim())
    .filter(Boolean)
}

/** Normalize mapping rows before save (dedupe terms, trim fields). */
export function normalizeSecularTermMapForSave(map: SecularTermMapFile): SecularTermMapFile {
  const seenTerms = new Set<string>()
  const mappings: SecularTermMapping[] = []

  for (const row of map.mappings) {
    const biblicalTopic = row.biblicalTopic.trim()
    if (!biblicalTopic) continue

    const secularTerms: string[] = []
    for (const term of row.secularTerms) {
      const trimmed = term.trim()
      if (!trimmed) continue
      const key = normalizeSecularTerm(trimmed)
      if (seenTerms.has(key)) continue
      seenTerms.add(key)
      secularTerms.push(trimmed)
    }
    if (secularTerms.length === 0) continue

    mappings.push({
      biblicalTopic,
      secularTerms,
    })
  }

  return {
    pinnedSectionTitle: map.pinnedSectionTitle.trim(),
    introHtml: map.introHtml.trim(),
    mappings,
  }
}

export function parseSecularTermMapFile(raw: unknown): SecularTermMapFile {
  const data = raw as SecularTermMapFile
  if (!data || typeof data.pinnedSectionTitle !== 'string' || !Array.isArray(data.mappings)) {
    throw new Error('Invalid secular term map shape')
  }
  return {
    pinnedSectionTitle: data.pinnedSectionTitle.trim(),
    introHtml: typeof data.introHtml === 'string' ? data.introHtml : '',
    mappings: data.mappings.filter(
      (row) =>
        row &&
        typeof row.biblicalTopic === 'string' &&
        Array.isArray(row.secularTerms) &&
        row.secularTerms.length > 0
    ),
  }
}

/** Parse and normalize for persistence. */
export function parseSecularTermMapForSave(raw: unknown): SecularTermMapFile {
  return normalizeSecularTermMapForSave(parseSecularTermMapFile(raw))
}

export type SecularTermLookupResult = {
  matchedSecularTerm: string
  biblicalTopic: string
}

const IN_PAGE_SEARCH_MIN_LENGTH = 3

/** Match when query equals a term or is a substring of a term (min 3 chars). */
export function lookupSecularTermMap(
  query: string,
  map: SecularTermMapFile = EMPTY_SECULAR_TERM_MAP
): SecularTermLookupResult | null {
  const normalizedQuery = normalizeSecularTerm(query)
  if (normalizedQuery.length < IN_PAGE_SEARCH_MIN_LENGTH) return null

  for (const row of map.mappings) {
    for (const term of row.secularTerms) {
      const normalizedTerm = normalizeSecularTerm(term)
      if (!normalizedTerm) continue
      if (normalizedTerm === normalizedQuery || normalizedTerm.includes(normalizedQuery)) {
        return {
          matchedSecularTerm: term.trim(),
          biblicalTopic: row.biblicalTopic.trim(),
        }
      }
    }
  }
  return null
}

export function normalizeSectionTitleKey(title: string): string {
  return title.trim().toLowerCase()
}

/** Case-insensitive section title → `section-N` anchor id after renumbering. */
export function buildSectionAnchorByTitle(
  sections: GospelSection[]
): Map<string, string> {
  const out = new Map<string, string>()
  for (const section of sections) {
    const key = normalizeSectionTitleKey(section.title)
    if (!key) continue
    out.set(key, `section-${section.section}`)
  }
  return out
}

export type SecularTermMapValidationIssue = {
  biblicalTopic: string
  kind: 'unknown_topic'
}

/** Warn when a mapping target is not a profile section title. */
export function validateSecularTermMapAgainstSections(
  map: SecularTermMapFile,
  sections: GospelSection[]
): SecularTermMapValidationIssue[] {
  const titles = new Set(sections.map((s) => normalizeSectionTitleKey(s.title)))
  const pinnedKey = normalizeSectionTitleKey(map.pinnedSectionTitle)
  const issues: SecularTermMapValidationIssue[] = []

  for (const row of map.mappings) {
    const key = normalizeSectionTitleKey(row.biblicalTopic)
    if (!key || titles.has(key) || key === pinnedKey) continue
    issues.push({ biblicalTopic: row.biblicalTopic, kind: 'unknown_topic' })
  }
  return issues
}

export function buildSecularTermMapSectionHtml(
  map: SecularTermMapFile,
  sectionAnchorByTitle: Map<string, string>
): string {
  const intro = map.introHtml.trim()
  const rows = map.mappings
    .map((row) => {
      const topicKey = normalizeSectionTitleKey(row.biblicalTopic)
      const anchor = sectionAnchorByTitle.get(topicKey)
      const termsLabel = row.secularTerms.map((t) => escapeHtml(t.trim())).join(', ')
      const topicHtml = anchor
        ? `<a href="#${escapeHtml(anchor)}">${escapeHtml(row.biblicalTopic.trim())}</a>`
        : escapeHtml(row.biblicalTopic.trim())
      return `<tr><td>${termsLabel}</td><td class="secular-term-map-topic-cell"><span class="secular-term-map-topic">→&nbsp;${topicHtml}</span></td></tr>`
    })
    .join('')

  return `${intro}<table class="secular-term-map-table"><thead><tr><th scope="col">Secular / common term</th><th scope="col">Biblical topic</th></tr></thead><tbody>${rows}</tbody></table>`
}

/** Insert or update the pinned mapping section and keep it first; renumber all sections. */
export function applySecularTermMapToGospelData(
  gospelData: GospelSection[],
  map: SecularTermMapFile
): SecularTermMapValidationIssue[] {
  const pinnedKey = normalizeSectionTitleKey(map.pinnedSectionTitle)
  const existing = gospelData.find((s) => normalizeSectionTitleKey(s.title) === pinnedKey)
  const mappingSection: GospelSection = existing ?? {
    section: '1',
    title: map.pinnedSectionTitle,
    subsections: [{ title: '', content: '' }],
  }

  const withoutMapping = gospelData.filter(
    (s) => normalizeSectionTitleKey(s.title) !== pinnedKey
  )

  gospelData.length = 0
  gospelData.push(mappingSection, ...withoutMapping)
  sortGospelSectionsWithPinnedFirst(gospelData, [map.pinnedSectionTitle])

  const topicSections = gospelData.filter(
    (s) => normalizeSectionTitleKey(s.title) !== pinnedKey
  )
  const anchorByTitle = buildSectionAnchorByTitle(topicSections)
  mappingSection.subsections = [
    {
      title: '',
      content: buildSecularTermMapSectionHtml(map, anchorByTitle),
      scriptureReferences: [],
      externalResourceLinks: [],
    },
  ]

  return validateSecularTermMapAgainstSections(map, gospelData)
}
