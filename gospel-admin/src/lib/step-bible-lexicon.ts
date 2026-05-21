import fs from 'fs'
import path from 'path'
import type { StepBibleLexiconResult } from '@/lib/step-bible-types'
import {
  hebrewLexiconLookupKeys,
  normalizeStrongsForLookup,
  stripStepBibleMarkup,
} from '@/lib/step-bible-text'

export { normalizeStrongsForLookup } from '@/lib/step-bible-text'
import { getStepBibleDataRoot } from '@/lib/step-bible-data-root'

export type LexiconBriefEntry = {
  lemma?: string
  transliteration?: string
  gloss?: string
  definition?: string
}

export type LexiconFullEntry = {
  definition: string
}

type GreekLexiconFile = {
  brief: Record<string, LexiconBriefEntry>
  full: Record<string, LexiconFullEntry>
}

type HebrewLexiconFile = {
  brief: Record<string, LexiconBriefEntry>
}

let greekLexicon: GreekLexiconFile | null | undefined
let hebrewLexicon: HebrewLexiconFile | null | undefined

export function clearStepBibleLexiconCache(): void {
  greekLexicon = undefined
  hebrewLexicon = undefined
}

function loadGreekLexicon(): GreekLexiconFile | null {
  if (greekLexicon !== undefined) return greekLexicon
  const p = path.join(getStepBibleDataRoot(), 'lexicon', 'greek.json')
  if (!fs.existsSync(p)) {
    greekLexicon = null
    return null
  }
  try {
    greekLexicon = JSON.parse(fs.readFileSync(p, 'utf8')) as GreekLexiconFile
    return greekLexicon
  } catch {
    greekLexicon = null
    return null
  }
}

function loadHebrewLexicon(): HebrewLexiconFile | null {
  if (hebrewLexicon !== undefined) return hebrewLexicon
  const p = path.join(getStepBibleDataRoot(), 'lexicon', 'hebrew.json')
  if (!fs.existsSync(p)) {
    hebrewLexicon = null
    return null
  }
  try {
    hebrewLexicon = JSON.parse(fs.readFileSync(p, 'utf8')) as HebrewLexiconFile
    return hebrewLexicon
  } catch {
    hebrewLexicon = null
    return null
  }
}

export function lookupLexicon(
  strongs: string,
  detail: 'brief' | 'full'
): StepBibleLexiconResult | null {
  const norm = normalizeStrongsForLookup(strongs)
  if (!norm) return null

  if (norm.language === 'grc') {
    const lex = loadGreekLexicon()
    if (!lex) return null
    const brief = lex.brief[norm.key]
    if (!brief) return null
    if (detail === 'full') {
      const full = lex.full[norm.key]
      return {
        strongs: norm.key,
        language: 'grc',
        lemma: brief.lemma,
        transliteration: brief.transliteration,
        gloss: brief.gloss,
        definition: stripStepBibleMarkup(full?.definition ?? brief.definition ?? ''),
        source: full ? 'TFLSJ' : 'TBESG',
        detail: 'full',
      }
    }
    return {
      strongs: norm.key,
      language: 'grc',
      lemma: brief.lemma,
      transliteration: brief.transliteration,
      gloss: brief.gloss,
      definition: stripStepBibleMarkup(brief.definition ?? brief.gloss ?? ''),
      source: 'TBESG',
      detail: 'brief',
    }
  }

  const lex = loadHebrewLexicon()
  if (!lex) return null

  const keysToTry =
    norm.language === 'heb' ? hebrewLexiconLookupKeys(strongs) : [norm.key]
  for (const key of keysToTry) {
    const brief = lex.brief[key]
    if (!brief) continue
    const result: StepBibleLexiconResult = {
      strongs: key,
      language: 'heb',
      lemma: brief.lemma,
      transliteration: brief.transliteration,
      gloss: brief.gloss,
      definition: stripStepBibleMarkup(brief.definition ?? brief.gloss ?? ''),
      source: 'TBESH',
      detail: 'brief',
    }
    if (detail === 'full') {
      result.note =
        'Full BDB (TFBDB) is not yet available in STEPBible-Data; showing brief TBESH entry.'
      result.detail = 'full'
    }
    return result
  }
  return null
}
