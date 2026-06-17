import { createAdminClient } from '@/lib/supabase/server'
import type { BibleTranslation } from '@/lib/bible-translations'

/** Whether `translation_settings` has this code enabled (ESV assumed enabled if row missing). */
export async function isTranslationEnabled(
  translation: BibleTranslation
): Promise<boolean> {
  if (translation === 'esv') {
    return true
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('translation_settings')
    .select('translation_code')
    .eq('translation_code', translation)
    .eq('is_enabled', true)
    .maybeSingle()

  if (error) {
    return false
  }

  return !!data
}
