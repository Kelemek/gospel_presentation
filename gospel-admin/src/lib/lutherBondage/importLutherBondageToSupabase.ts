import type { SupabaseClient } from '@supabase/supabase-js'
import { importEdwardsBookToSupabase, type ParsedEdwardsBook } from '@/lib/edwardsBooks/importEdwardsBookToSupabase'
import type { ParsedLutherBondage } from '@/lib/lutherBondage/ccelLutherBondageHtml'

/** Upsert Luther *The Bondage of the Will* (`ltbw`) and rebuild `spurgeon_passage_index`. */
export function importLutherBondageToSupabase(
  supabase: SupabaseClient,
  parsed: ParsedLutherBondage
) {
  const book: ParsedEdwardsBook = {
    slug: parsed.slug,
    title: parsed.title,
    gospelData: parsed.gospelData,
    passageKeys: parsed.passageKeys,
  }
  return importEdwardsBookToSupabase(supabase, book)
}
