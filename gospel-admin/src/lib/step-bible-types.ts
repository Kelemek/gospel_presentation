/** STEPBible word-study types (TAGNT / TAHOT + lexicons). */

export type StepBibleLanguage = 'heb' | 'grc'

export interface StepBibleWord {
  position: number
  text: string
  transliteration?: string
  strongs: string
  morph?: string
  gloss?: string
}

export interface StepBibleVerseWords {
  language: StepBibleLanguage
  words: StepBibleWord[]
}

export interface StepBibleWordStudyVerseSection {
  verse: number
  passageKey: string
  stepRef: string
  words: StepBibleWord[]
}

export interface StepBibleWordStudyResult {
  reference: string
  passageKey: string
  stepRef: string
  language: StepBibleLanguage
  /** First verse only; use `verses` for ranges. */
  words: StepBibleWord[]
  verses: StepBibleWordStudyVerseSection[]
  unavailableReason?: string
}

export interface StepBibleLexiconResult {
  strongs: string
  language: StepBibleLanguage
  lemma?: string
  transliteration?: string
  gloss?: string
  definition: string
  source: 'TBESG' | 'TBESH' | 'TFLSJ'
  detail: 'brief' | 'full'
  note?: string
}
