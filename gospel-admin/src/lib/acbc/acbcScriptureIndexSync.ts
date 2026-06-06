import { BIBLE_CANON_BOOKS_STATIC } from '@/lib/bibleCanonStatic'
import { segmentPlainTextForGospelInlines } from '@/lib/injectGospelInlineMarkersInHtml'
import { parseReference } from '@/lib/parse-scripture-reference'
import {
  normalizeScriptureDisplay,
  scanCanonicalScriptureSpansInPlainText,
} from '@/lib/scriptureReferenceNormalize'
import { gospelHtmlToPlainForScriptureScan } from '@/lib/spurgeon/passageKeysFromGospelData'
import type { ExternalResourceLink, ScriptureReference } from '@/lib/types'

import { decodeHtmlEntities, normalizeAcbcResourceUrl } from './externalResourceLinksSync'

const ACBC_SCRIPTURE_INDEX_BASE = 'https://biblicalcounseling.com/resource-library/scripture-index'
const ACBC_NON_BOOK_SLUG_RE = /^(individual-booklets|booklet-bundles|annual-conference)-/

const BOOK_SLUG_LINK_RE =
  /<a href="\/resource-library\/scripture-index\/([a-z0-9-]+)">([^<]+)<\/a>/gi

const CARD_OVERLINK_RE =
  /<a href="(https:\/\/biblicalcounseling\.com\/resource-library\/(?:articles|podcast-episodes|conference-messages|recommended-books|essays)\/[^"]+)" class="overlink">[\s\S]*?<h4 class="subtitle text-large">([^<]*)<\/h4>/gi

const CARD_OVERLINK_URL_RE =
  /<a href="(https:\/\/biblicalcounseling\.com\/resource-library\/(?:articles|podcast-episodes|conference-messages|recommended-books|essays)\/[^"]+)" class="overlink">/gi

const TRUTH_IN_LOVE_SUBTITLE_RE = /^truth in love\b/i

const ACBC_ARTICLE_BODY_RE = /<article[^>]*>([\s\S]*?)<\/article>/i
const ACBC_ARTICLE_TITLE_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/i

const CANON_BOOK_ORDER = new Map(
  BIBLE_CANON_BOOKS_STATIC.map((book, index) => [book.name.toLowerCase(), index])
)

CANON_BOOK_ORDER.set('psalm', CANON_BOOK_ORDER.get('psalms') ?? 18)

const CANON_BOOK_ALIAS_KEYS = new Map<string, Set<string>>()
for (const book of BIBLE_CANON_BOOKS_STATIC) {
  const keys = new Set<string>([book.name.toLowerCase()])
  if (book.name === 'Psalms') keys.add('psalm')
  if (book.name === 'Song of Solomon') keys.add('song of songs')
  CANON_BOOK_ALIAS_KEYS.set(book.name.toLowerCase(), keys)
}

function canonBookAliasKeys(bookName: string): Set<string> {
  const trimmed = bookName.trim().toLowerCase()
  return CANON_BOOK_ALIAS_KEYS.get(trimmed) ?? new Set([trimmed])
}

export function scriptureReferenceMatchesAcbcBooks(
  reference: string,
  bookNames: readonly string[]
): boolean {
  const parsed = parseReference(reference.trim())
  if (!parsed || bookNames.length === 0) return false
  const refKeys = canonBookAliasKeys(parsed.book)
  for (const bookName of bookNames) {
    const allowed = canonBookAliasKeys(bookName)
    for (const key of refKeys) {
      if (allowed.has(key)) return true
    }
  }
  return false
}

function isCanonScriptureReference(reference: string): boolean {
  const parsed = parseReference(reference.trim())
  if (!parsed) return false
  const key = parsed.book.trim().toLowerCase()
  if (key === 'psalm') return true
  return CANON_BOOK_ORDER.has(key)
}

export function isAcbcCanonScriptureIndexSlug(slug: string): boolean {
  return !ACBC_NON_BOOK_SLUG_RE.test(slug.trim())
}

/** Book slugs with linked archive pages on ACBC scripture index (excludes booklet/event slugs). */
export function parseAcbcScriptureIndexBookSlugsFromHtml(html: string): { slug: string; bookName: string }[] {
  const bySlug = new Map<string, string>()
  let match: RegExpExecArray | null
  const re = new RegExp(BOOK_SLUG_LINK_RE.source, BOOK_SLUG_LINK_RE.flags)
  while ((match = re.exec(html)) !== null) {
    const slug = match[1].trim()
    if (!isAcbcCanonScriptureIndexSlug(slug)) continue
    const bookName = decodeHtmlEntities(match[2])
    if (!bookName) continue
    bySlug.set(slug, bookName)
  }
  return [...bySlug.entries()].map(([slug, bookName]) => ({ slug, bookName }))
}

export function acbcSlugToBookName(slug: string): string {
  return slug
    .split('-')
    .map((part) => (/^\d+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ')
}

function canonicalBookOrder(reference: string): number {
  const parsed = parseReference(reference.trim())
  if (!parsed) return Number.MAX_SAFE_INTEGER
  const key = parsed.book.trim().toLowerCase()
  return CANON_BOOK_ORDER.get(key) ?? Number.MAX_SAFE_INTEGER
}

export function sortScriptureReferenceStrings(refs: string[]): string[] {
  return [...refs].sort((a, b) => {
    const bookDelta = canonicalBookOrder(a) - canonicalBookOrder(b)
    if (bookDelta !== 0) return bookDelta

    const pa = parseReference(a)
    const pb = parseReference(b)
    if (!pa || !pb) return a.localeCompare(b)

    if (pa.chapter !== pb.chapter) return pa.chapter - pb.chapter
    const va = pa.verseStart ?? 0
    const vb = pb.verseStart ?? 0
    return va - vb
  })
}

export function extractScriptureRefsFromAcbcText(text: string): string[] {
  const trimmed = decodeHtmlEntities(text.replace(/<[^>]+>/g, ' '))
  if (!trimmed || TRUTH_IN_LOVE_SUBTITLE_RE.test(trimmed)) return []

  const normalized = normalizeScriptureDisplay(trimmed.replace(/\u2013/g, '-'))
  if (isCanonScriptureReference(normalized)) return [normalized]

  const scanText = (value: string) => scanCanonicalScriptureSpansInPlainText(value)

  let spans = scanText(trimmed)
  if (spans.length === 0) {
    const withoutTrailingProse = trimmed
      .replace(/\s+[a-z][a-z]+(?:\s+[a-z][a-z]+)*$/i, '')
      .trim()
    if (withoutTrailingProse && withoutTrailingProse !== trimmed) {
      spans = scanText(withoutTrailingProse)
    }
  }

  const refs: string[] = []
  const seen = new Set<string>()
  for (const span of spans) {
    const ref = normalizeScriptureDisplay(span.cleanRef.replace(/\u2013/g, '-'))
    if (!isCanonScriptureReference(ref)) continue
    const key = ref.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    refs.push(ref)
  }
  return refs
}

/** Article URL → scripture refs from ACBC resource cards (topic or scripture-index pages). */
export function parseAcbcResourceCardScriptureRefsFromHtml(html: string): Map<string, string[]> {
  const byUrl = new Map<string, Set<string>>()

  const addRef = (rawUrl: string, ref: string) => {
    const url = normalizeAcbcResourceUrl(rawUrl)
    const normalized = normalizeScriptureDisplay(ref.replace(/\u2013/g, '-'))
    if (!isCanonScriptureReference(normalized)) return
    const bucket = byUrl.get(url) ?? new Set<string>()
    bucket.add(normalized)
    byUrl.set(url, bucket)
  }

  let match: RegExpExecArray | null
  const re = new RegExp(CARD_OVERLINK_RE.source, CARD_OVERLINK_RE.flags)
  while ((match = re.exec(html)) !== null) {
    const url = match[1]
    for (const ref of extractScriptureRefsFromAcbcText(match[2])) {
      addRef(url, ref)
    }
  }

  const out = new Map<string, string[]>()
  for (const [url, refs] of byUrl.entries()) {
    out.set(url, sortScriptureReferenceStrings([...refs]))
  }
  return out
}

/** Article URLs listed on an ACBC scripture-index book page → that book. */
export function parseAcbcScriptureIndexArticleBooksFromBookHtml(
  html: string,
  pageBookName: string
): Map<string, string[]> {
  const bookName = pageBookName.trim()
  if (!bookName) return new Map()

  const byUrl = new Map<string, Set<string>>()
  let match: RegExpExecArray | null
  const re = new RegExp(CARD_OVERLINK_URL_RE.source, CARD_OVERLINK_URL_RE.flags)
  while ((match = re.exec(html)) !== null) {
    const url = normalizeAcbcResourceUrl(match[1])
    const books = byUrl.get(url) ?? new Set<string>()
    books.add(bookName)
    byUrl.set(url, books)
  }

  const out = new Map<string, string[]>()
  for (const [url, books] of byUrl.entries()) {
    out.set(url, [...books].sort((a, b) => a.localeCompare(b)))
  }
  return out
}

export function mergeAcbcArticleBookIndexMaps(
  ...maps: Map<string, string[]>[]
): Map<string, string[]> {
  const merged = new Map<string, Set<string>>()
  for (const map of maps) {
    for (const [url, books] of map.entries()) {
      const bucket = merged.get(url) ?? new Set<string>()
      for (const book of books) bucket.add(book)
      merged.set(url, bucket)
    }
  }
  const out = new Map<string, string[]>()
  for (const [url, books] of merged.entries()) {
    out.set(url, [...books].sort((a, b) => a.localeCompare(b)))
  }
  return out
}

export function extractAcbcArticleBodyHtml(pageHtml: string): string {
  const articleMatch = pageHtml.match(ACBC_ARTICLE_BODY_RE)
  if (articleMatch?.[1]) return articleMatch[1]
  return pageHtml
}

export function extractAcbcArticleTitleFromPageHtml(pageHtml: string): string {
  const titleMatch = pageHtml.match(ACBC_ARTICLE_TITLE_RE)
  if (!titleMatch?.[1]) return ''
  return decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
}

/** Scan article HTML and keep only references in the scripture-index book(s) for this URL. */
export function extractScriptureRefsFromAcbcArticleHtml(
  pageHtml: string,
  bookNames: readonly string[]
): string[] {
  if (bookNames.length === 0) return []

  const chunks = [
    extractAcbcArticleTitleFromPageHtml(pageHtml),
    gospelHtmlToPlainForScriptureScan(extractAcbcArticleBodyHtml(pageHtml)),
  ]

  const seen = new Set<string>()
  const refs: string[] = []

  const consider = (rawRef: string) => {
    const ref = normalizeScriptureDisplay(rawRef.replace(/\u2013/g, '-'))
    if (!isCanonScriptureReference(ref)) return
    if (!scriptureReferenceMatchesAcbcBooks(ref, bookNames)) return
    const key = ref.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    refs.push(ref)
  }

  for (const plain of chunks) {
    if (!plain) continue
    for (const span of scanCanonicalScriptureSpansInPlainText(plain)) {
      consider(span.cleanRef)
    }
    for (const seg of segmentPlainTextForGospelInlines(plain)) {
      if (seg.kind === 'scripture') consider(seg.cleanRef)
    }
  }

  return sortScriptureReferenceStrings(refs)
}

export async function fetchAcbcResourcePageHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'gospel-presentation-sync/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

export async function scrapeAcbcArticleScriptureRefsForBooks(
  url: string,
  bookNames: readonly string[],
  cache?: Map<string, string[]>
): Promise<string[]> {
  const normalizedUrl = normalizeAcbcResourceUrl(url)
  if (cache?.has(normalizedUrl)) return cache.get(normalizedUrl) ?? []

  const html = await fetchAcbcResourcePageHtml(normalizedUrl)
  const refs = extractScriptureRefsFromAcbcArticleHtml(html, bookNames)
  cache?.set(normalizedUrl, refs)
  return refs
}

export function mergeAcbcArticleScriptureIndexMaps(
  ...maps: Map<string, string[]>[]
): Map<string, string[]> {
  const merged = new Map<string, Set<string>>()
  for (const map of maps) {
    for (const [url, refs] of map.entries()) {
      const bucket = merged.get(url) ?? new Set<string>()
      for (const ref of refs) bucket.add(ref)
      merged.set(url, bucket)
    }
  }
  const out = new Map<string, string[]>()
  for (const [url, refs] of merged.entries()) {
    out.set(url, sortScriptureReferenceStrings([...refs]))
  }
  return out
}

export function scriptureReferencesForAcbcExternalLinks(
  links: ExternalResourceLink[],
  articleScriptureIndex: Map<string, string[]>
): ScriptureReference[] {
  const seen = new Set<string>()
  const refs: string[] = []

  for (const link of links) {
    const url = normalizeAcbcResourceUrl(link.url)
    const candidates = [
      ...(articleScriptureIndex.get(url) ?? []),
      ...extractScriptureRefsFromAcbcText(link.label),
    ]
    for (const ref of candidates) {
      const key = ref.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      refs.push(ref)
    }
  }

  return sortScriptureReferenceStrings(refs).map((reference) => ({ reference }))
}

function scriptureReferenceSortKey(reference: string): string {
  return normalizeScriptureDisplay(reference.replace(/\u2013/g, '-')).toLowerCase()
}

/** Merge scripture cards; earlier lists win on duplicate refs (preserves favorite flags). */
export function mergeScriptureReferenceLists(
  ...lists: (ScriptureReference[] | undefined)[]
): ScriptureReference[] {
  const byKey = new Map<string, ScriptureReference>()

  for (const list of lists) {
    for (const item of list ?? []) {
      const reference = normalizeScriptureDisplay((item.reference || '').replace(/\u2013/g, '-'))
      if (!isCanonScriptureReference(reference)) continue
      const key = scriptureReferenceSortKey(reference)
      if (byKey.has(key)) continue
      byKey.set(key, { ...item, reference })
    }
  }

  const refs = sortScriptureReferenceStrings([...byKey.values()].map((item) => item.reference))
  return refs.map((reference) => {
    const key = scriptureReferenceSortKey(reference)
    return byKey.get(key) ?? { reference }
  })
}

export async function fetchAcbcScriptureIndexMainHtml(): Promise<string> {
  const res = await fetch(`${ACBC_SCRIPTURE_INDEX_BASE}/`, {
    headers: { 'User-Agent': 'gospel-presentation-sync/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${ACBC_SCRIPTURE_INDEX_BASE}/`)
  return res.text()
}

export async function fetchAcbcScriptureIndexBookHtml(slug: string): Promise<string> {
  const url = `${ACBC_SCRIPTURE_INDEX_BASE}/${slug}/`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'gospel-presentation-sync/1.0' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

export type BuildAcbcArticleScriptureIndexOptions = {
  /** When false, only card subtitles are used (no article body fetch). Default true. */
  scrapeArticleBodies?: boolean
}

/** Build article URL → scripture refs from ACBC scripture-index book pages + article bodies. */
export async function buildAcbcArticleScriptureIndexFromScriptureIndex(
  options: BuildAcbcArticleScriptureIndexOptions = {}
): Promise<Map<string, string[]>> {
  const { scrapeArticleBodies = true } = options
  const mainHtml = await fetchAcbcScriptureIndexMainHtml()
  const books = parseAcbcScriptureIndexBookSlugsFromHtml(mainHtml)
  const subtitleMaps: Map<string, string[]>[] = []
  const bookIndexMaps: Map<string, string[]>[] = []

  for (const { slug, bookName } of books) {
    const html = await fetchAcbcScriptureIndexBookHtml(slug)
    subtitleMaps.push(parseAcbcResourceCardScriptureRefsFromHtml(html))
    bookIndexMaps.push(
      parseAcbcScriptureIndexArticleBooksFromBookHtml(html, bookName || acbcSlugToBookName(slug))
    )
  }

  const merged = mergeAcbcArticleScriptureIndexMaps(...subtitleMaps)
  if (!scrapeArticleBodies) return merged

  const articleBooks = mergeAcbcArticleBookIndexMaps(...bookIndexMaps)
  const scrapeCache = new Map<string, string[]>()
  const scrapedMaps: Map<string, string[]>[] = []

  for (const [url, bookNames] of articleBooks.entries()) {
    const refs = await scrapeAcbcArticleScriptureRefsForBooks(url, bookNames, scrapeCache)
    if (refs.length > 0) {
      scrapedMaps.push(new Map([[url, refs]]))
    }
  }

  return mergeAcbcArticleScriptureIndexMaps(merged, ...scrapedMaps)
}
