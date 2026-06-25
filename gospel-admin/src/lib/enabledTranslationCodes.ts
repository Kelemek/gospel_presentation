import { createClient } from '@/lib/supabase/server'

export interface EnabledTranslationOption {
  translation_code: string
  translation_name: string
}

const DEFAULT_ESV_OPTION: EnabledTranslationOption = {
  translation_code: 'esv',
  translation_name: 'ESV (English Standard Version)',
}

/** Enabled Bible translations (code + display name; ESV always included). */
export async function getEnabledTranslationOptions(): Promise<EnabledTranslationOption[]> {
  const supabase = await createClient()
  const { data, error } = (await supabase
    .from('translation_settings')
    .select('translation_code, translation_name, display_order')
    .eq('is_enabled', true)
    .order('display_order', { ascending: true })) as {
    data: Array<{
      translation_code: string
      translation_name: string
      display_order: number
    }> | null
    error: unknown
  }

  if (error || !data?.length) {
    return [DEFAULT_ESV_OPTION]
  }

  const options = data
    .map((row) => ({
      translation_code: String(row.translation_code ?? '').trim(),
      translation_name:
        typeof row.translation_name === 'string' && row.translation_name.trim() !== ''
          ? row.translation_name.trim()
          : String(row.translation_code ?? '').toUpperCase(),
    }))
    .filter((row) => row.translation_code)

  if (!options.some((row) => row.translation_code === 'esv')) {
    options.unshift(DEFAULT_ESV_OPTION)
  }

  return options
}

/** Enabled Bible translation codes for footer attribution (ESV always included). */
export async function getEnabledTranslationCodes(): Promise<string[]> {
  const options = await getEnabledTranslationOptions()
  return options.map((row) => row.translation_code)
}
