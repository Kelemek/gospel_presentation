import promptsData from '../../data/daily-verse-challenge/prompts.json'
import {
  DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES,
  pickRandomDailyVerseHuntEncouragementMessage,
} from '@/lib/dailyVerseHuntEncouragementMessages'
import { gospelStorageGetSync, gospelStorageSetSync } from '@/lib/gospelClientStorage'
import { parseReference } from '@/lib/parse-scripture-reference'
import { normalizeScriptureReferenceString } from '@/lib/scriptureReferenceNormalize'

export type DailyVersePromptKind =
  | 'verse_blank'
  | 'chapter_blank'
  | 'book_blank'

export type DailyVerseReferenceMask = {
  hide: Array<'book' | 'chapter' | 'verse'>
}

export type DailyVersePromptMask = {
  reference: DailyVerseReferenceMask
}

export type DailyVersePrompt = {
  id: string
  reference: string
  kind: DailyVersePromptKind
  mask: DailyVersePromptMask
}

export type DailyVersePromptsFile = {
  version: number
  translation: 'esv'
  prompts: DailyVersePrompt[]
}

export type DailyVerseChallengeCompletion = {
  dateKey: string
  promptId: string
  encouragementMessage?: string
}

export type DailyVerseChallengeWin = {
  prompt: DailyVersePrompt
  encouragementMessage: string
}

export const DAILY_VERSE_CHALLENGE_STORAGE_KEY = 'gospel-daily-verse-challenge-v1'

/** Local calendar date `YYYY-MM-DD`. */
export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Deterministic daily index from date string. */
export function hashDateKey(dateKey: string): number {
  let hash = 0
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function normalizePromptIndex(index: number, promptCount: number): number {
  if (promptCount <= 0) return 0
  return ((index % promptCount) + promptCount) % promptCount
}

export function getPromptIndexForDate(
  prompts: DailyVersePrompt[],
  date: Date = new Date()
): number {
  if (prompts.length === 0) return 0
  return hashDateKey(getLocalDateKey(date)) % prompts.length
}

export function getPromptAtIndex(
  prompts: DailyVersePrompt[],
  index: number
): DailyVersePrompt | null {
  if (prompts.length === 0) return null
  return prompts[normalizePromptIndex(index, prompts.length)] ?? null
}

export function getTodayPrompt(
  prompts: DailyVersePrompt[],
  date: Date = new Date()
): DailyVersePrompt | null {
  return getPromptAtIndex(prompts, getPromptIndexForDate(prompts, date))
}

export function loadDailyVersePrompts(): DailyVersePrompt[] {
  const file = promptsData as DailyVersePromptsFile
  return file.prompts ?? []
}

export function loadDailyVerseChallengeCompletion(): DailyVerseChallengeCompletion | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = gospelStorageGetSync(DAILY_VERSE_CHALLENGE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DailyVerseChallengeCompletion
    if (
      typeof parsed.dateKey === 'string' &&
      typeof parsed.promptId === 'string'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function saveDailyVerseChallengeCompletion(
  completion: DailyVerseChallengeCompletion
): void {
  if (typeof window === 'undefined') return
  try {
    gospelStorageSetSync(DAILY_VERSE_CHALLENGE_STORAGE_KEY, JSON.stringify(completion))
  } catch {
    // Quota or private mode — completion is best-effort
  }
}

export function isTodayChallengeCompleted(
  promptId: string,
  date: Date = new Date()
): boolean {
  const stored = loadDailyVerseChallengeCompletion()
  if (!stored) return false
  return stored.dateKey === getLocalDateKey(date) && stored.promptId === promptId
}

export function resolveDailyVerseHuntEncouragementMessage(
  completion: DailyVerseChallengeCompletion
): string {
  if (completion.encouragementMessage) {
    return completion.encouragementMessage
  }
  if (DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES.length === 0) {
    return ''
  }
  const index =
    hashDateKey(`${completion.dateKey}:${completion.promptId}`) %
    DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES.length
  return DAILY_VERSE_HUNT_ENCOURAGEMENT_MESSAGES[index] ?? ''
}

export function getTodayDailyVerseHuntEncouragementMessage(
  date: Date = new Date()
): string | null {
  const stored = loadDailyVerseChallengeCompletion()
  if (!stored || stored.dateKey !== getLocalDateKey(date)) return null
  return resolveDailyVerseHuntEncouragementMessage(stored)
}

export const DAILY_VERSE_HUNT_TOMORROW_MESSAGE =
  'There will be a new verse to find tomorrow.'

export function formatMaskedReference(
  reference: string,
  mask: DailyVerseReferenceMask
): string {
  const parsed = parseReference(reference.trim())
  if (!parsed) return reference

  const hideBook = mask.hide.includes('book')
  const hideChapter = mask.hide.includes('chapter')
  const hideVerse = mask.hide.includes('verse')

  const book = hideBook ? '???' : parsed.book
  const chapter =
    parsed.verseStart != null
      ? hideChapter
        ? '__'
        : String(parsed.chapter)
      : hideChapter
        ? '__'
        : String(parsed.chapter)

  if (parsed.verseStart == null) {
    return hideChapter ? `${book} __` : `${book} ${chapter}`
  }

  const verse = hideVerse ? '__' : String(parsed.verseStart)
  if (hideChapter) {
    return `${book} __:${verse}`
  }
  return `${book} ${chapter}:${verse}`
}

/** Strip a leading verse marker from passage text (`[16] …` or `16 …`). */
export function stripLeadingVerseNumberMarker(text: string): string {
  return text
    .trim()
    .replace(/^\[\d{1,3}\]\s*/, '')
    .replace(/^\d{1,3}\s+/, '')
    .trim()
}

/** Strip leading verse number from ESV passage text and split into words. */
export function tokenizeVerseForMask(text: string): string[] {
  const withoutNumber = stripLeadingVerseNumberMarker(text)
  return withoutNumber
    .split(/\s+/)
    .map((w) => w.replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter(Boolean)
}

export function formatVerseClueSnippet(text: string, maxWords = 12): string {
  const words = tokenizeVerseForMask(text)
  if (words.length <= maxWords) {
    return words.join(' ')
  }
  return `${words.slice(0, maxWords).join(' ')}…`
}

export function referencesMatchExactVerse(
  openedReference: string,
  targetReference: string
): boolean {
  const openedNorm = normalizeScriptureReferenceString(openedReference.trim())
  const targetNorm = normalizeScriptureReferenceString(targetReference.trim())
  const opened = parseReference(openedNorm)
  const target = parseReference(targetNorm)
  if (!opened || !target) return false

  if (target.verseStart == null) {
    return false
  }

  if (opened.verseStart == null) {
    return false
  }

  const openedBook = opened.book.toLowerCase()
  const targetBook = target.book.toLowerCase()
  if (openedBook !== targetBook) return false
  if (opened.chapter !== target.chapter) return false

  if (opened.verseStart === target.verseStart) {
    return true
  }

  if (
    opened.verseEnd != null &&
    opened.verseStart <= target.verseStart &&
    opened.verseEnd >= target.verseStart
  ) {
    return true
  }

  return false
}

export function referenceToPromptSlug(reference: string): string {
  return reference
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * If the opened reference completes today's hunt, persist completion and return the prompt.
 */
export function tryCompleteDailyVerseChallenge(
  openedReference: string,
  date: Date = new Date(),
  prompts: DailyVersePrompt[] = loadDailyVersePrompts()
): DailyVerseChallengeWin | null {
  const prompt = getTodayPrompt(prompts, date)
  if (!prompt) return null
  if (isTodayChallengeCompleted(prompt.id, date)) return null
  if (!referencesMatchExactVerse(openedReference, prompt.reference)) return null

  const encouragementMessage = pickRandomDailyVerseHuntEncouragementMessage()
  saveDailyVerseChallengeCompletion({
    dateKey: getLocalDateKey(date),
    promptId: prompt.id,
    encouragementMessage,
  })
  return { prompt, encouragementMessage }
}
