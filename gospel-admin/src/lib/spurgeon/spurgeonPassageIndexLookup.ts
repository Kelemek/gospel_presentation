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

export function structuredPassageKeyForIndexLookup(ref: string): string | null {
  const fromParse = referenceToApiBiblePassageId(ref)
  if (fromParse) return fromParse
  const canon = canonicalScriptureCacheReference(ref).trim()
  if (/^[A-Z0-9]+\.[0-9]/.test(canon)) return canon
  return null
}

/** Resolve profile ids from `spurgeon_passage_index` for a scripture reference string. */
export async function profileIdsFromPassageIndexLookup(
  admin: SupabaseClient,
  ref: string
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
    const orFilter = usfmCodes.map((code) => `passage_key.like.${code}.%`).join(',')
    const { data: broadRows, error: broadErr } = await admin
      .from('spurgeon_passage_index')
      .select('profile_id')
      .or(orFilter)
      .limit(BOOK_PREFIX_INDEX_ROW_CAP)

    if (broadErr) throw broadErr
    indexRows = broadRows || []
  }

  return [...new Set((indexRows || []).map((r: { profile_id: string }) => r.profile_id))]
}

export async function publicProfilesByIdsAndSlugPrefix(
  admin: SupabaseClient,
  profileIds: string[],
  slugPrefix: 'sg' | 'me'
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
