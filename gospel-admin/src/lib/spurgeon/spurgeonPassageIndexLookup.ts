import type { SupabaseClient } from '@supabase/supabase-js'
import {
  canonicalScriptureCacheReference,
  referenceToApiBiblePassageId,
  usfmBookPrefixesForSearchQuery,
} from '@/lib/api-bible-passage-id'
import {
  spurgeonPassageIndexBroadOrFilter,
  spurgeonPassageKeySpansOverlap,
} from '@/lib/spurgeon/spurgeonPassageKeyMatch'

const BOOK_PREFIX_INDEX_ROW_CAP = 4000
/** Max public template profile ids to pass into `.in('profile_id', …)` for book-prefix scans. */
const BOOK_PREFIX_PROFILE_IN_CAP = 500

export type PassageIndexSlugPrefix = 'sg' | 'me' | 'cv' | 'je'

export type PassageIndexLookupOptions = {
  /** Limit book-prefix index rows to profiles with this slug prefix (fixes cap misses for small corpora). */
  slugPrefix?: PassageIndexSlugPrefix
}

export function structuredPassageKeyForIndexLookup(ref: string): string | null {
  const fromParse = referenceToApiBiblePassageId(ref)
  if (fromParse) return fromParse
  const canon = canonicalScriptureCacheReference(ref).trim()
  if (/^[A-Z0-9]+\.[0-9]/.test(canon)) return canon
  return null
}

async function publicTemplateProfileIdsForSlugPrefix(
  admin: SupabaseClient,
  slugPrefix: PassageIndexSlugPrefix
): Promise<string[]> {
  const { data, error } = await admin
    .from('profiles')
    .select('id')
    .like('slug', `${slugPrefix}%`)
    .eq('is_public', true)
    .eq('is_template', true)

  if (error) throw error
  return (data || []).map((r: { id: string }) => r.id)
}

/** Resolve profile ids from `spurgeon_passage_index` for a scripture reference string. */
export async function profileIdsFromPassageIndexLookup(
  admin: SupabaseClient,
  ref: string,
  options?: PassageIndexLookupOptions
): Promise<string[]> {
  let indexRows: { profile_id: string; passage_key?: string }[] | null = null
  const passageKey = structuredPassageKeyForIndexLookup(ref)

  if (passageKey) {
    const { data: exactRows, error: idxErr } = await admin
      .from('spurgeon_passage_index')
      .select('profile_id')
      .eq('passage_key', passageKey)

    if (idxErr) throw idxErr
    indexRows = exactRows || []

    if (indexRows.length === 0) {
      const orFilter = spurgeonPassageIndexBroadOrFilter(passageKey)
      if (orFilter) {
        const { data: broadRows, error: broadErr } = await admin
          .from('spurgeon_passage_index')
          .select('profile_id, passage_key')
          .or(orFilter)

        if (broadErr) throw broadErr

        indexRows = (broadRows || []).filter((r: { passage_key: string }) =>
          spurgeonPassageKeySpansOverlap(passageKey, r.passage_key)
        )
      }
    }
  } else {
    const usfmCodes = usfmBookPrefixesForSearchQuery(ref)
    if (usfmCodes.length === 0) return []

    let profileIdFilter: string[] | undefined
    if (options?.slugPrefix) {
      profileIdFilter = await publicTemplateProfileIdsForSlugPrefix(admin, options.slugPrefix)
      if (profileIdFilter.length === 0) return []
    }

    const orFilter = usfmCodes.map((code) => `passage_key.like.${code}.%`).join(',')
    let query = admin
      .from('spurgeon_passage_index')
      .select('profile_id')
      .or(orFilter)
      .limit(BOOK_PREFIX_INDEX_ROW_CAP)

    if (
      profileIdFilter &&
      profileIdFilter.length > 0 &&
      profileIdFilter.length <= BOOK_PREFIX_PROFILE_IN_CAP
    ) {
      query = query.in('profile_id', profileIdFilter)
    }

    const { data: broadRows, error: broadErr } = await query

    if (broadErr) throw broadErr
    indexRows = broadRows || []
  }

  return [...new Set((indexRows || []).map((r: { profile_id: string }) => r.profile_id))]
}

export async function publicProfilesByIdsAndSlugPrefix(
  admin: SupabaseClient,
  profileIds: string[],
  slugPrefix: 'sg' | 'me' | 'cv' | 'je'
): Promise<{ slug: string; title: string }[]> {
  if (profileIds.length === 0) return []

  const { data: profiles, error: profErr } = await admin
    .from('profiles')
    .select('slug,title')
    .in('id', profileIds)
    .eq('is_public', true)
    .eq('is_template', true)
    .like('slug', `${slugPrefix}%`)

  if (profErr) throw profErr
  return (profiles || []) as { slug: string; title: string }[]
}
