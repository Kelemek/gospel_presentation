import type { SupabaseClient } from '@supabase/supabase-js'
import { sortCalvinBooksByCanonOrder } from '@/lib/calvin/calvinSlug'
import {
  EDWARDS_SERMON_SLUG_POSTGREST_MATCH,
  sortEdwardsSermonsByDisplayTitleAZ,
} from '@/lib/edwards/edwardsSlug'
import { sortHenryBooksByCanonOrder } from '@/lib/henry/henrySlug'
import { logger } from '@/lib/logger'
import { normalizeLibrarySearchQuery } from '@/lib/normalizeLibrarySearchQuery'
import { sortMorneveRowsByCalendar } from '@/lib/spurgeon/morneveSlug'
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'

export type KindleReadLibraryKind = 'spurgeon' | 'morneve' | 'calvin' | 'henry' | 'edwards'

export const KINDLE_READ_LIBRARY_PAGE_SIZE = 50

export type KindleReadLibraryRow = { slug: string; title: string }

export type KindleReadLibraryPage = {
  kind: KindleReadLibraryKind
  title: string
  items: KindleReadLibraryRow[]
  total: number
  page: number
  pageSize: number
  query?: string
}

const LIBRARY_TITLES: Record<KindleReadLibraryKind, string> = {
  spurgeon: 'Spurgeon sermons',
  morneve: "Spurgeon's Morning & Evening",
  calvin: "Calvin's Commentaries",
  henry: "Matthew Henry's Commentary",
  edwards: 'Jonathan Edwards sermons',
}

export function isKindleReadLibraryKind(value: string): value is KindleReadLibraryKind {
  return value in LIBRARY_TITLES
}

export function kindleReadLibraryTitle(kind: KindleReadLibraryKind): string {
  return LIBRARY_TITLES[kind]
}

export function kindleReadLibraryIndexUrl(
  kind: KindleReadLibraryKind,
  page = 1,
  fromSlug?: string,
  query?: string
): string {
  const base = `/read/libraries/${kind}/`
  const params = new URLSearchParams()
  if (page > 1) params.set('page', String(page))
  const normalizedQuery = query?.trim() ? normalizeLibrarySearchQuery(query) : null
  if (normalizedQuery) params.set('q', normalizedQuery)
  if (fromSlug?.trim()) params.set('from', fromSlug.trim())
  const q = params.toString()
  return q ? `${base}?${q}` : base
}

type SpurgeonRpcDatabase = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: {
      spurgeon_public_sermons_page: {
        Args: { p_q: string | null; p_offset: number; p_limit: number }
        Returns: Json
      }
    }
    Enums: Record<string, never>
  }
}

type SermonsRpcPayload = { total: number; items: { slug: string; title: string }[] }

function isSermonsRpcPayload(v: unknown): v is SermonsRpcPayload {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (typeof o.total !== 'number' || !Array.isArray(o.items)) return false
  return o.items.every((row) => {
    if (!row || typeof row !== 'object') return false
    const r = row as { slug?: unknown; title?: unknown }
    return typeof r.slug === 'string'
  })
}

function filterRowsByTitleQuery(
  rows: KindleReadLibraryRow[],
  query: string | null
): KindleReadLibraryRow[] {
  if (!query) return rows
  const lower = query.toLowerCase()
  return rows.filter((row) => {
    const title = (row.title || row.slug).toLowerCase()
    const slug = row.slug.toLowerCase()
    return title.includes(lower) || slug.includes(lower)
  })
}

async function fetchSpurgeonLibraryPage(
  page: number,
  pageSize: number,
  query: string | null
): Promise<KindleReadLibraryPage> {
  const from = (page - 1) * pageSize
  const admin = createAdminClient() as unknown as SupabaseClient<SpurgeonRpcDatabase>
  const { data, error } = await admin.rpc('spurgeon_public_sermons_page', {
    p_q: query,
    p_offset: from,
    p_limit: pageSize,
  })

  if (error || !isSermonsRpcPayload(data)) {
    logger.error('[kindle-read] spurgeon library fetch failed', { error })
    return {
      kind: 'spurgeon',
      title: LIBRARY_TITLES.spurgeon,
      items: [],
      total: 0,
      page,
      pageSize,
      query: query ?? undefined,
    }
  }

  return {
    kind: 'spurgeon',
    title: LIBRARY_TITLES.spurgeon,
    items: data.items.map((r) => ({ slug: r.slug, title: r.title || r.slug })),
    total: data.total,
    page,
    pageSize,
    query: query ?? undefined,
  }
}

async function fetchSlugPrefixLibraryPage(
  kind: Exclude<KindleReadLibraryKind, 'spurgeon' | 'edwards'>,
  slugPrefix: string,
  page: number,
  pageSize: number,
  sortRows: (rows: KindleReadLibraryRow[]) => KindleReadLibraryRow[],
  query: string | null
): Promise<KindleReadLibraryPage> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('profiles')
    .select('slug, title')
    .eq('is_template', true)
    .eq('is_public', true)
    .ilike('slug', `${slugPrefix}%`)

  if (error) {
    logger.error('[kindle-read] library fetch failed', { kind, error })
    return { kind, title: LIBRARY_TITLES[kind], items: [], total: 0, page, pageSize, query: query ?? undefined }
  }

  const sorted = sortRows(
    filterRowsByTitleQuery(
      ((data ?? []) as KindleReadLibraryRow[]).map((r) => ({
        slug: r.slug,
        title: r.title || r.slug,
      })),
      query
    )
  )
  const from = (page - 1) * pageSize
  return {
    kind,
    title: LIBRARY_TITLES[kind],
    items: sorted.slice(from, from + pageSize),
    total: sorted.length,
    page,
    pageSize,
    query: query ?? undefined,
  }
}

async function fetchEdwardsLibraryPage(
  page: number,
  pageSize: number,
  query: string | null
): Promise<KindleReadLibraryPage> {
  const admin = createAdminClient()
  let dbQuery = admin
    .from('profiles')
    .select('slug, title')
    .eq('is_template', true)
    .eq('is_public', true)
    .filter('slug', 'match', EDWARDS_SERMON_SLUG_POSTGREST_MATCH)

  if (query) {
    const pattern = `%${query.replace(/%/g, '').replace(/_/g, '')}%`
    dbQuery = dbQuery.or(`title.ilike.${pattern},slug.ilike.${pattern}`)
  }

  const { data, error } = await dbQuery

  if (error) {
    logger.error('[kindle-read] edwards library fetch failed', { error })
    return {
      kind: 'edwards',
      title: LIBRARY_TITLES.edwards,
      items: [],
      total: 0,
      page,
      pageSize,
      query: query ?? undefined,
    }
  }

  const sorted = sortEdwardsSermonsByDisplayTitleAZ((data ?? []) as KindleReadLibraryRow[]).map((r) => ({
    slug: r.slug,
    title: r.title || r.slug,
  }))
  const from = (page - 1) * pageSize
  return {
    kind: 'edwards',
    title: LIBRARY_TITLES.edwards,
    items: sorted.slice(from, from + pageSize),
    total: sorted.length,
    page,
    pageSize,
    query: query ?? undefined,
  }
}

export async function fetchKindleReadLibraryPage(
  kind: KindleReadLibraryKind,
  page: number,
  pageSize = KINDLE_READ_LIBRARY_PAGE_SIZE,
  rawQuery?: string
): Promise<KindleReadLibraryPage> {
  const safePage = Math.max(1, page)
  const query = rawQuery?.trim() ? normalizeLibrarySearchQuery(rawQuery) : null
  switch (kind) {
    case 'spurgeon':
      return fetchSpurgeonLibraryPage(safePage, pageSize, query)
    case 'morneve':
      return fetchSlugPrefixLibraryPage('morneve', 'me', safePage, pageSize, sortMorneveRowsByCalendar, query)
    case 'calvin':
      return fetchSlugPrefixLibraryPage('calvin', 'cv', safePage, pageSize, sortCalvinBooksByCanonOrder, query)
    case 'henry':
      return fetchSlugPrefixLibraryPage('henry', 'mh', safePage, pageSize, sortHenryBooksByCanonOrder, query)
    case 'edwards':
      return fetchEdwardsLibraryPage(safePage, pageSize, query)
    default: {
      const _exhaustive: never = kind
      return _exhaustive
    }
  }
}
