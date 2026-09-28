import type { BibleTranslation } from '@/lib/bible-translations'

/** Query string for `GET /api/scripture` (red-letter reader requests `wordsOfChristText`). */
export function scriptureApiSearchParams(
  reference: string,
  translation: BibleTranslation,
  options?: { includeWordsOfChristMarkup?: boolean }
): string {
  const params = new URLSearchParams({
    reference,
    translation,
  })
  if (options?.includeWordsOfChristMarkup) {
    params.set('wocMarkup', '1')
  }
  return params.toString()
}

export type ScriptureApiPassageJson = {
  text?: string
  wordsOfChristText?: string
}

/** Passage string for ScriptureModal HTML (marked when the API provides `wordsOfChristText`). */
export function passageTextForScriptureReader(data: ScriptureApiPassageJson): string {
  const plain = typeof data.text === 'string' ? data.text : ''
  const marked = typeof data.wordsOfChristText === 'string' ? data.wordsOfChristText : ''
  return marked.trim() ? marked : plain
}
