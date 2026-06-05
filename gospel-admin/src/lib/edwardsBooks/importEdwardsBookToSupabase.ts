import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { profileDbTouchFields } from '@/lib/profileDbTouch'
import type { GospelPresentationData } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ParsedEdwardsBook {
  slug: string
  title: string
  gospelData: GospelPresentationData
  passageKeys: string[]
}

/** Upsert a CCEL Edwards treatise profile and rebuild `spurgeon_passage_index`. */
export async function importEdwardsBookToSupabase(
  supabase: SupabaseClient,
  parsed: ParsedEdwardsBook
): Promise<{
  slug: string
  action: 'inserted' | 'updated'
  passageKeyCount: number
  subsectionCount: number
  sectionCount: number
}> {
  const { gospelData, passageKeys } = finalizeGospelDataForImport(parsed.gospelData, {
    additionalPassageKeys: parsed.passageKeys,
  })

  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', parsed.slug)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${parsed.slug}: ${JSON.stringify(selErr)}`)
  }

  let profileId: string
  let action: 'inserted' | 'updated'

  if (existing?.id) {
    profileId = existing.id
    const { error: upErr } = await supabase
      .from('profiles')
      .update({
        title: parsed.title,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: true,
        include_in_resources_menu: true,
        ...profileDbTouchFields(),
      })
      .eq('id', profileId)

    if (upErr) {
      throw new Error(`Update ${parsed.slug}: ${JSON.stringify(upErr)}`)
    }
    action = 'updated'
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .insert({
        slug: parsed.slug,
        title: parsed.title,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: true,
        include_in_resources_menu: true,
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      throw new Error(`Insert ${parsed.slug}: ${JSON.stringify(insErr)}`)
    }
    profileId = inserted.id
    action = 'inserted'
  }

  const { error: delErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profileId)
  if (delErr) {
    throw new Error(`Clear index for ${parsed.slug}: ${JSON.stringify(delErr)}`)
  }

  if (passageKeys.length > 0) {
    const rows = passageKeys.map((passage_key, i) => ({
      passage_key,
      profile_id: profileId,
      sermon_no: null,
      is_primary: i === 0,
    }))
    const { error: idxErr } = await supabase.from('spurgeon_passage_index').insert(rows)
    if (idxErr) {
      throw new Error(`Index ${parsed.slug}: ${JSON.stringify(idxErr)}`)
    }
  }

  const subsectionCount = gospelData.reduce((n, sec) => n + (sec.subsections?.length ?? 0), 0)

  return {
    slug: parsed.slug,
    action,
    passageKeyCount: passageKeys.length,
    subsectionCount,
    sectionCount: gospelData.length,
  }
}
