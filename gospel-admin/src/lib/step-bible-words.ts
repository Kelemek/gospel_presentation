import fs from 'fs'
import path from 'path'
import {
  stepBibleChapterWordsRelPath,
  type WordStudyPassageTarget,
} from '@/lib/step-bible-reference'
import type { StepBibleVerseWords, StepBibleWord, StepBibleWordStudyResult } from '@/lib/step-bible-types'
import { getStepBibleDataRoot } from '@/lib/step-bible-data-root'
import { lookupLexicon } from '@/lib/step-bible-lexicon'
import { looksLikeHebrewMorphCode, normalizeStepBibleWordFields } from '@/lib/step-bible-text'

export type StepBibleChapterFile = Record<string, StepBibleVerseWords>

let chapterCache: Map<string, StepBibleChapterFile> = new Map()

export function clearStepBibleWordsCache(): void {
  chapterCache = new Map()
}

function chapterFilePath(usfm: string, chapter: number): string {
  return path.join(getStepBibleDataRoot(), stepBibleChapterWordsRelPath(usfm, chapter))
}

export function loadStepBibleChapter(usfm: string, chapter: number): StepBibleChapterFile | null {
  const cacheKey = `${usfm}.${chapter}`
  if (chapterCache.has(cacheKey)) {
    return chapterCache.get(cacheKey) ?? null
  }
  const filePath = chapterFilePath(usfm, chapter)
  if (!fs.existsSync(filePath)) {
    chapterCache.set(cacheKey, null as unknown as StepBibleChapterFile)
    return null
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw) as StepBibleChapterFile
    chapterCache.set(cacheKey, data)
    return data
  } catch {
    return null
  }
}

/** Fill missing Hebrew transliteration from TBESH when import JSON predates col2 fix. */
export function enrichStepBibleWord(word: StepBibleWord): StepBibleWord {
  let w = normalizeStepBibleWordFields(word)
  if (looksLikeHebrewMorphCode(w.gloss ?? '')) {
    const morph = w.gloss!.trim()
    const entry = lookupLexicon(w.strongs, 'brief')
    w = {
      ...w,
      morph: w.morph || morph,
      gloss: entry?.gloss || undefined,
    }
  }
  if (!w.transliteration?.trim() && w.strongs) {
    const entry = lookupLexicon(w.strongs, 'brief')
    if (entry?.transliteration) {
      w = { ...w, transliteration: entry.transliteration }
    }
  }
  return w
}

export function getVerseWords(target: WordStudyPassageTarget): StepBibleWord[] | null {
  const chapter = loadStepBibleChapter(target.usfm, target.chapter)
  if (!chapter) return null
  const verseKey = String(target.verse)
  const entry = chapter[verseKey]
  if (!entry?.words?.length) return null
  return entry.words.map(enrichStepBibleWord)
}

export function formatWordStudyStepRef(targets: WordStudyPassageTarget[]): string {
  if (targets.length === 0) return ''
  if (targets.length === 1) return targets[0].stepRef
  const first = targets[0]
  const last = targets[targets.length - 1]
  const bookChapter = first.stepRef.replace(/\.\d+$/, '')
  if (bookChapter === last.stepRef.replace(/\.\d+$/, '')) {
    return `${bookChapter}.${first.verse}-${last.verse}`
  }
  return `${first.stepRef}–${last.stepRef}`
}

export function buildWordStudyResult(
  targets: WordStudyPassageTarget[],
  unavailableReason?: string
): StepBibleWordStudyResult {
  const verses = targets.map((target) => ({
    verse: target.verse,
    passageKey: target.passageKey,
    stepRef: target.stepRef,
    words: getVerseWords(target) ?? [],
  }))
  const first = targets[0]
  return {
    reference: first?.reference ?? '',
    passageKey: first?.passageKey ?? '',
    stepRef: formatWordStudyStepRef(targets),
    language: first?.language ?? 'grc',
    words: verses[0]?.words ?? [],
    verses,
    ...(unavailableReason ? { unavailableReason } : {}),
  }
}

export function isStepBibleDataPresent(): boolean {
  const root = getStepBibleDataRoot()
  return fs.existsSync(path.join(root, 'words'))
}
