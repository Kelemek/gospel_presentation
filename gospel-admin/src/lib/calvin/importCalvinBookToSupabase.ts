import type { SupabaseClient } from '@supabase/supabase-js'
import type { GospelPresentationData, Subsection } from '@/lib/types'
import { gospelSectionForCalvinBook, type ParsedCalvinBookChunk } from '@/lib/calvin/ccelCalvinHtml'
import { calvinProfileTitleForUsfm, calvinSlugForUsfm } from '@/lib/calvin/calvinSlug'

export type CalvinImportMergeMode = 'replace' | 'append'

/** Upsert one Calvin commentary book profile and rebuild `spurgeon_passage_index` rows. */
export async function importCalvinBookToSupabase(
  supabase: SupabaseClient,
  bookUsfm: string,
  subsections: Subsection[],
  passageKeys: string[],
  options?: { mergeMode?: CalvinImportMergeMode }
): Promise<{ slug: string; action: 'inserted' | 'updated'; passageKeyCount: number; subsectionCount: number }> {
  const mergeMode = options?.mergeMode ?? 'replace'
  const slug = calvinSlugForUsfm(bookUsfm)
  const title = calvinProfileTitleForUsfm(bookUsfm)

  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id,gospel_data')
    .eq('slug', slug)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${slug}: ${JSON.stringify(selErr)}`)
  }

  let mergedSubsections = subsections
  if (mergeMode === 'append' && existing?.id) {
    const existingData = existing.gospel_data as GospelPresentationData | null
    const prior = existingData?.[0]?.subsections ?? []
    mergedSubsections = [...prior, ...subsections]
  }

  const gospelData: GospelPresentationData = [gospelSectionForCalvinBook(bookUsfm, mergedSubsections)]

  let profileId: string
  let action: 'inserted' | 'updated'

  if (existing?.id) {
    profileId = existing.id
    const { error: upErr } = await supabase
      .from('profiles')
      .update({
        title,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: true,
        include_in_resources_menu: false,
      })
      .eq('id', profileId)

    if (upErr) {
      throw new Error(`Update ${slug}: ${JSON.stringify(upErr)}`)
    }
    action = 'updated'
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .insert({
        slug,
        title,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: true,
        include_in_resources_menu: false,
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      throw new Error(`Insert ${slug}: ${JSON.stringify(insErr)}`)
    }
    profileId = inserted.id
    action = 'inserted'
  }

  let keys = [...new Set(passageKeys)]
  if (mergeMode === 'append' && existing?.id) {
    const { data: priorIdx, error: idxSelErr } = await supabase
      .from('spurgeon_passage_index')
      .select('passage_key')
      .eq('profile_id', profileId)
    if (idxSelErr) {
      throw new Error(`Read index for ${slug}: ${JSON.stringify(idxSelErr)}`)
    }
    const priorKeys = (priorIdx ?? []).map((r) => r.passage_key).filter(Boolean)
    keys = [...new Set([...priorKeys, ...keys])]
  }

  const { error: delErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profileId)
  if (delErr) {
    throw new Error(`Clear index for ${slug}: ${JSON.stringify(delErr)}`)
  }
  if (keys.length > 0) {
    const rows = keys.map((passage_key, i) => ({
      passage_key,
      profile_id: profileId,
      sermon_no: null,
      is_primary: i === 0,
    }))
    const { error: idxErr } = await supabase.from('spurgeon_passage_index').insert(rows)
    if (idxErr) {
      throw new Error(`Index ${slug}: ${JSON.stringify(idxErr)}`)
    }
  }

  return {
    slug,
    action,
    passageKeyCount: keys.length,
    subsectionCount: mergedSubsections.length,
  }
}

/** Import parsed volume chunks (append per book when profile already exists). */
export async function importCalvinVolumeChunksToSupabase(
  supabase: SupabaseClient,
  chunks: ParsedCalvinBookChunk[],
  options?: { mergeMode?: CalvinImportMergeMode }
): Promise<
  { bookUsfm: string; slug: string; action: 'inserted' | 'updated'; passageKeyCount: number; subsectionCount: number }[]
> {
  const results: {
    bookUsfm: string
    slug: string
    action: 'inserted' | 'updated'
    passageKeyCount: number
    subsectionCount: number
  }[] = []

  for (const chunk of chunks) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', calvinSlugForUsfm(chunk.bookUsfm))
      .maybeSingle()

    const mergeMode: CalvinImportMergeMode =
      options?.mergeMode ?? (existing?.id ? 'append' : 'replace')

    const r = await importCalvinBookToSupabase(
      supabase,
      chunk.bookUsfm,
      chunk.subsections,
      chunk.passageKeys,
      { mergeMode }
    )
    results.push({ bookUsfm: chunk.bookUsfm, ...r })
  }

  return results
}
