import type { SupabaseClient } from '@supabase/supabase-js'
import type { GospelPresentationData } from '@/lib/types'
import type { ParsedCcelSermonDiv1 } from '@/lib/spurgeon/ccelSermonHtml'

/** Upsert one parsed CCEL sermon into `profiles` and rebuild `spurgeon_passage_index` (same rules as the import script). */
export async function importCcelParsedSermonToSupabase(
  supabase: SupabaseClient,
  sermon: ParsedCcelSermonDiv1
): Promise<{ slug: string; action: 'inserted' | 'updated'; passageKeyCount: number }> {
  const gospelData: GospelPresentationData = [sermon.gospelSection]

  const { data: existing, error: selErr } = await supabase
    .from('profiles')
    .select('id,is_public')
    .eq('slug', sermon.slug)
    .maybeSingle()

  if (selErr) {
    throw new Error(`Lookup ${sermon.slug}: ${JSON.stringify(selErr)}`)
  }

  const keepPublic = existing?.is_public === true
  const nextPublic = keepPublic

  let profileId: string
  let action: 'inserted' | 'updated'

  if (existing?.id) {
    profileId = existing.id
    const { error: upErr } = await supabase
      .from('profiles')
      .update({
        title: sermon.sermonTitle,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: nextPublic,
        include_in_resources_menu: false,
      })
      .eq('id', profileId)

    if (upErr) {
      throw new Error(`Update ${sermon.slug}: ${JSON.stringify(upErr)}`)
    }
    action = 'updated'
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from('profiles')
      .insert({
        slug: sermon.slug,
        title: sermon.sermonTitle,
        description: null,
        gospel_data: gospelData as never,
        is_template: true,
        is_public: false,
        include_in_resources_menu: false,
      })
      .select('id')
      .single()

    if (insErr || !inserted?.id) {
      throw new Error(`Insert ${sermon.slug}: ${JSON.stringify(insErr)}`)
    }
    profileId = inserted.id
    action = 'inserted'
  }

  const { error: delErr } = await supabase.from('spurgeon_passage_index').delete().eq('profile_id', profileId)
  if (delErr) {
    throw new Error(`Clear index for ${sermon.slug}: ${JSON.stringify(delErr)}`)
  }

  const keys = sermon.passageKeys
  if (keys.length > 0) {
    const rows = keys.map((passage_key, i) => ({
      passage_key,
      profile_id: profileId,
      sermon_no: sermon.sermonNo,
      is_primary: i === 0,
    }))
    const { error: idxErr } = await supabase.from('spurgeon_passage_index').insert(rows)
    if (idxErr) {
      throw new Error(`Index ${sermon.slug}: ${JSON.stringify(idxErr)}`)
    }
  }

  return { slug: sermon.slug, action, passageKeyCount: keys.length }
}
