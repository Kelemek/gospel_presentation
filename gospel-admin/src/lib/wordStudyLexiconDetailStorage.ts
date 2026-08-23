import { gospelStorageSetSync } from '@/lib/gospelClientStorage'

export const WORD_STUDY_LEXICON_DETAIL_STORAGE_KEY = 'gospel-word-study-lexicon-detail'

export type WordStudyLexiconDetailPreference = 'brief' | 'full'

export function normalizeWordStudyLexiconDetail(
  raw: string | null
): WordStudyLexiconDetailPreference {
  return raw === 'full' ? 'full' : 'brief'
}

export function readWordStudyLexiconDetailFromStorage(): WordStudyLexiconDetailPreference {
  if (typeof window === 'undefined') return 'brief'
  try {
    return normalizeWordStudyLexiconDetail(
      window.localStorage.getItem(WORD_STUDY_LEXICON_DETAIL_STORAGE_KEY)
    )
  } catch {
    return 'brief'
  }
}

/** Greek uses the stored Brief/Full choice; Hebrew/Aramaic always open Brief. */
export function readWordStudyLexiconDetailForLanguage(
  language: string | undefined
): WordStudyLexiconDetailPreference {
  if (language === 'grc') return readWordStudyLexiconDetailFromStorage()
  return 'brief'
}

export function writeWordStudyLexiconDetailToStorage(
  detail: WordStudyLexiconDetailPreference
): void {
  if (typeof window === 'undefined') return
  try {
    gospelStorageSetSync(WORD_STUDY_LEXICON_DETAIL_STORAGE_KEY, detail)
  } catch {
    /* ignore */
  }
}
