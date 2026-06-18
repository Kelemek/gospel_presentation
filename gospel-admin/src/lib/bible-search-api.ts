import { formatApiBiblePassageText } from '@/lib/api-bible-format'
import type { ApiBibleTranslation, BibleTranslation } from '@/lib/bible-translations'
import { isApiBibleTranslation } from '@/lib/bible-translations'

export const BIBLE_SEARCH_MIN_QUERY_LENGTH = 3
export const BIBLE_SEARCH_DEFAULT_PAGE_SIZE = 20
export const BIBLE_SEARCH_MAX_PAGE_SIZE = 50

export type BibleSearchHit = {
  reference: string
  snippet: string
}

export type BibleSearchPage = {
  translation: BibleTranslation
  query: string
  total: number
  page: number
  pageSize: number
  totalPages: number
  items: BibleSearchHit[]
}

const API_BIBLE_ID_ENV: Record<ApiBibleTranslation, string> = {
  kjv: 'API_BIBLE_BIBLE_ID_KJV',
  nasb: 'API_BIBLE_BIBLE_ID_NASB',
  lsb: 'API_BIBLE_BIBLE_ID_LSB',
  niv: 'API_BIBLE_BIBLE_ID_NIV',
  nlt: 'API_BIBLE_BIBLE_ID_NLT',
  csb: 'API_BIBLE_BIBLE_ID_CSB',
}

type EsvSearchResponse = {
  page?: number
  total_results?: number
  total_pages?: number
  results?: Array<{ reference?: string; content?: string }>
}

type ApiBibleSearchVerse = {
  reference?: string
  content?: string
  text?: string
  id?: string
}

type ApiBibleSearchResponse = {
  data?: {
    total?: number
    verseCount?: number
    limit?: number
    offset?: number
    verses?: ApiBibleSearchVerse[]
    passages?: ApiBibleSearchVerse[]
  }
}

export function clampBibleSearchPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    return BIBLE_SEARCH_DEFAULT_PAGE_SIZE
  }
  return Math.min(BIBLE_SEARCH_MAX_PAGE_SIZE, Math.floor(pageSize))
}

export function bibleSearchSnippetFromText(raw: string, maxLen = 240): string {
  const formatted = formatApiBiblePassageText(raw)
  const plain = formatted
    .replace(/\[\d+\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return ''
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen - 1)}…`
}

/** ~3 lines in a search result card at text-sm on a narrow phone. */
export const BIBLE_SEARCH_SNIPPET_DISPLAY_MAX_LEN = 170

/** Plain-text snippet for the modal (no CSS line-clamp; iOS mis-measures -webkit-line-clamp). */
export function bibleSearchSnippetForDisplay(
  snippet: string,
  maxLen = BIBLE_SEARCH_SNIPPET_DISPLAY_MAX_LEN
): string {
  const plain = snippet.endsWith('…') ? snippet.slice(0, -1).trimEnd() : snippet
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen - 1)}…`
}

function totalPagesFromCount(total: number, pageSize: number): number {
  if (total <= 0) return 0
  return Math.max(1, Math.ceil(total / pageSize))
}

async function searchEsv(
  query: string,
  page: number,
  pageSize: number
): Promise<BibleSearchPage> {
  const apiToken = process.env.ESV_API_TOKEN
  if (!apiToken) {
    throw new Error('ESV API token not configured')
  }

  const params = new URLSearchParams({
    q: query,
    page: String(page),
    'page-size': String(pageSize),
  })
  const response = await fetch(`https://api.esv.org/v3/passage/search/?${params}`, {
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`ESV API error: ${response.status}`)
  }

  const data = (await response.json()) as EsvSearchResponse
  const total = typeof data.total_results === 'number' ? data.total_results : 0
  const totalPages =
    typeof data.total_pages === 'number' && data.total_pages > 0
      ? data.total_pages
      : totalPagesFromCount(total, pageSize)

  const items: BibleSearchHit[] = (data.results ?? [])
    .map((row) => {
      const reference = row.reference?.trim() ?? ''
      const content = row.content?.trim() ?? ''
      if (!reference || !content) return null
      return {
        reference,
        snippet: bibleSearchSnippetFromText(content),
      }
    })
    .filter((row): row is BibleSearchHit => row !== null)

  return {
    translation: 'esv',
    query,
    total,
    page,
    pageSize,
    totalPages,
    items,
  }
}

function apiBibleHitFromVerse(row: ApiBibleSearchVerse): BibleSearchHit | null {
  const reference = row.reference?.trim() ?? ''
  const raw = row.content ?? row.text ?? ''
  if (!reference || !raw.trim()) return null
  return {
    reference,
    snippet: bibleSearchSnippetFromText(raw),
  }
}

async function searchApiBible(
  translation: ApiBibleTranslation,
  query: string,
  page: number,
  pageSize: number
): Promise<BibleSearchPage> {
  const apiKey = process.env.API_BIBLE_KEY
  if (!apiKey) {
    throw new Error('API.Bible key not configured')
  }

  const envName = API_BIBLE_ID_ENV[translation]
  const bibleId = process.env[envName]
  if (!bibleId) {
    throw new Error(`API.Bible Bible ID not configured (${envName})`)
  }

  const offset = (page - 1) * pageSize
  const base = (process.env.API_BIBLE_BASE_URL || 'https://rest.api.bible').replace(/\/$/, '')
  const params = new URLSearchParams({
    query,
    limit: String(pageSize),
    offset: String(offset),
  })
  const url = `${base}/v1/bibles/${encodeURIComponent(bibleId)}/search?${params}`

  const response = await fetch(url, {
    headers: {
      'api-key': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`API.Bible error: ${response.status}`)
  }

  const payload = (await response.json()) as ApiBibleSearchResponse
  const data = payload.data
  const rawVerses = data?.verses ?? data?.passages ?? []
  const total =
    typeof data?.total === 'number'
      ? data.total
      : typeof data?.verseCount === 'number'
        ? data.verseCount
        : rawVerses.length

  const items = rawVerses
    .map(apiBibleHitFromVerse)
    .filter((row): row is BibleSearchHit => row !== null)

  const totalPages = totalPagesFromCount(total, pageSize)

  return {
    translation,
    query,
    total,
    page,
    pageSize,
    totalPages,
    items,
  }
}

/** Full-text Bible search for one translation (ESV or API.Bible). */
export async function searchBible(
  query: string,
  translation: BibleTranslation,
  page = 1,
  pageSize = BIBLE_SEARCH_DEFAULT_PAGE_SIZE
): Promise<BibleSearchPage> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < BIBLE_SEARCH_MIN_QUERY_LENGTH) {
    throw new Error(
      `Search query must be at least ${BIBLE_SEARCH_MIN_QUERY_LENGTH} characters`
    )
  }

  const safePage = Math.max(1, Math.floor(page))
  const safePageSize = clampBibleSearchPageSize(pageSize)

  if (translation === 'esv') {
    return searchEsv(trimmedQuery, safePage, safePageSize)
  }

  if (isApiBibleTranslation(translation)) {
    return searchApiBible(translation, trimmedQuery, safePage, safePageSize)
  }

  const _exhaustive: never = translation
  throw new Error(`Unsupported translation: ${String(_exhaustive)}`)
}
