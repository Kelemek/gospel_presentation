import { finalizeGospelDataForImport } from '@/lib/finalizeGospelDataForImport'
import { profileDbTouchFields } from '@/lib/profileDbTouch'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParsedCcelMorneveDay } from '@/lib/spurgeon/ccelMorneveHtml'

/** Upsert one parsed CCEL Morning & Evening day into `profiles` and rebuild `spurgeon_passage_index`. */
export async function importCcelMorneveDayToSupabase(
  supabase: SupabaseClient,
  day: ParsedCcelMorneveDay
): Promise<{ slug: string; action: 'inserted' | 'updated'; passageKeyCount: number }> {
  const { gospelData, passageKeys } = finalizeGospelDataForImport([day.gospelSection], {
    additionalPassageKeys: day.passageKeys,
  })

  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', day.slug)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${day.slug}: ${JSON.stringify(selErr)}`)
  }

  let profileId: string
  let action: 'inserted' | 'updated'

  if (existing?.id) {
    profileId = existing.id
    const { error: upErr } = await supabase
      .from('profiles')
      .update({
        title: day.title,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: true,
        include_in_resources_menu: false,
        ...profileDbTouchFields(),
      })
      .eq('id', profileId)

    if (upErr) {
      throw new Error(`Update ${day.slug}: ${JSON.stringify(upErr)}`)
    }
    action = 'updated'
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .insert({
        slug: day.slug,
        title: day.title,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: true,
        include_in_resources_menu: false,
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      throw new Error(`Insert ${day.slug}: ${JSON.stringify(insErr)}`)
    }
    profileId = inserted.id
    action = 'inserted'
  }

  const { error: delErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profileId)
  if (delErr) {
    throw new Error(`Clear index for ${day.slug}: ${JSON.stringify(delErr)}`)
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
      throw new Error(`Index ${day.slug}: ${JSON.stringify(idxErr)}`)
    }
  }

  return { slug: day.slug, action, passageKeyCount: passageKeys.length }
}
