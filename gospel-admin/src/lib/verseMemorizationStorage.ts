import type { BibleTranslation } from '@/lib/bible-translations'
import { isBibleTranslation } from '@/lib/bible-translations'
import { stripHtmlTags } from '@/lib/stripHtmlTags'

export const VERSE_MEMORIZATION_STORAGE_KEY = 'gospel-memorization-verses'
export const VERSE_MEMORIZATION_SCHEMA_VERSION = 1

export type MemorizationMasterLevel = 'learning' | 'practicing' | 'mastered'

export interface MemorizationPracticeSessionRecord {
  date: number
  /** Wrong first-letter attempts before completing the session (0 if none). */
  wrongAttempts: number
  /** Total first-letter keystrokes accepted (correct) — optional metric. */
  correctKeystrokes: number
  completed: boolean
}

/** Saved while a five-round run is in flight (localStorage only). */
export type MemorizationInProgressPhase =
  | { kind: 'betweenRounds'; completedRoundIndex: number }
  | { kind: 'inRound'; roundIndex: number }

/** How blanks are filled during an in-flight multi-round session. Omitted in storage means legacy type-only. */
export type MemorizationPracticeMode = 'type' | 'word'

export interface MemorizationInProgress {
  sessionSeed: string
  wrongAttempts: number
  correctKeystrokes: number
  updatedAt: number
  phase: MemorizationInProgressPhase
  practiceMode?: MemorizationPracticeMode
}

/** Payload from the practice UI (storage sets `updatedAt`). */
export type MemorizationInProgressSavePayload = Omit<MemorizationInProgress, 'updatedAt'>

export interface MemorizedVerse {
  id: string
  reference: string
  text: string
  translation: BibleTranslation
  dateAdded: number
  lastPracticedAt: number | null
  practiceSessions: MemorizationPracticeSessionRecord[]
  /** Resume point for the current multi-round practice session, if any. */
  inProgressPractice?: MemorizationInProgress | null
}

interface StoredShape {
  v: number
  verses: MemorizedVerse[]
}

function newId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function normalizeInProgress(raw: unknown): MemorizationInProgress | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as Record<string, unknown>
  const sessionSeed = o.sessionSeed
  const wrongAttempts = o.wrongAttempts
  const correctKeystrokes = o.correctKeystrokes
  const updatedAt = o.updatedAt
  const phase = o.phase
  if (
    typeof sessionSeed !== 'string' ||
    sessionSeed.length === 0 ||
    typeof wrongAttempts !== 'number' ||
    wrongAttempts < 0 ||
    typeof correctKeystrokes !== 'number' ||
    correctKeystrokes < 0 ||
    typeof updatedAt !== 'number' ||
    !phase ||
    typeof phase !== 'object'
  ) {
    return undefined
  }
  const practiceModeRaw = o.practiceMode
  const practiceMode: MemorizationPracticeMode | undefined =
    practiceModeRaw === 'type' || practiceModeRaw === 'word' ? practiceModeRaw : undefined
  const p = phase as Record<string, unknown>
  const kind = p.kind
  if (kind === 'betweenRounds') {
    const completedRoundIndex = p.completedRoundIndex
    if (
      typeof completedRoundIndex !== 'number' ||
      completedRoundIndex < 1 ||
      completedRoundIndex > 4
    ) {
      return undefined
    }
    return {
      sessionSeed,
      wrongAttempts,
      correctKeystrokes,
      updatedAt,
      phase: { kind: 'betweenRounds', completedRoundIndex },
      ...(practiceMode ? { practiceMode } : {}),
    }
  }
  if (kind === 'inRound') {
    const roundIndex = p.roundIndex
    if (typeof roundIndex !== 'number' || roundIndex < 1 || roundIndex > 5) {
      return undefined
    }
    return {
      sessionSeed,
      wrongAttempts,
      correctKeystrokes,
      updatedAt,
      phase: { kind: 'inRound', roundIndex },
      ...(practiceMode ? { practiceMode } : {}),
    }
  }
  return undefined
}

function normalizeVerse(v: unknown): MemorizedVerse | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  const id = o.id
  const reference = o.reference
  const text = o.text
  const translation = o.translation
  const dateAdded = o.dateAdded
  if (
    typeof id !== 'string' ||
    typeof reference !== 'string' ||
    typeof text !== 'string' ||
    typeof translation !== 'string' ||
    !isBibleTranslation(translation) ||
    typeof dateAdded !== 'number'
  ) {
    return null
  }
  const lastPracticedAt = o.lastPracticedAt
  const sessionsRaw = o.practiceSessions
  const practiceSessions: MemorizationPracticeSessionRecord[] = []
  if (Array.isArray(sessionsRaw)) {
    for (const s of sessionsRaw) {
      if (!s || typeof s !== 'object') continue
      const sr = s as Record<string, unknown>
      const date = sr.date
      const wrongAttempts = sr.wrongAttempts
      const correctKeystrokes = sr.correctKeystrokes
      const completed = sr.completed
      if (
        typeof date !== 'number' ||
        typeof wrongAttempts !== 'number' ||
        typeof correctKeystrokes !== 'number' ||
        typeof completed !== 'boolean'
      ) {
        continue
      }
      practiceSessions.push({ date, wrongAttempts, correctKeystrokes, completed })
    }
  }
  const inProgressPractice = normalizeInProgress(o.inProgressPractice)
  return {
    id,
    reference,
    text,
    translation,
    dateAdded,
    lastPracticedAt: typeof lastPracticedAt === 'number' ? lastPracticedAt : null,
    practiceSessions,
    ...(inProgressPractice ? { inProgressPractice } : {}),
  }
}

export function loadMemorizedVerses(): MemorizedVerse[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(VERSE_MEMORIZATION_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredShape
    if (!parsed || parsed.v !== VERSE_MEMORIZATION_SCHEMA_VERSION || !Array.isArray(parsed.verses)) {
      return []
    }
    return parsed.verses.map(normalizeVerse).filter((v): v is MemorizedVerse => v !== null)
  } catch {
    return []
  }
}

export const GOSPEL_MEMORIZATION_CHANGED_EVENT = 'gospel-memorization-changed'

export function emitMemorizationChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_MEMORIZATION_CHANGED_EVENT))
}

function persist(verses: MemorizedVerse[]): void {
  if (typeof window === 'undefined') return
  try {
    const payload: StoredShape = {
      v: VERSE_MEMORIZATION_SCHEMA_VERSION,
      verses,
    }
    window.localStorage.setItem(VERSE_MEMORIZATION_STORAGE_KEY, JSON.stringify(payload))
    emitMemorizationChanged()
  } catch {
    // quota / private mode
  }
}

/** Plain text for memorization: strip HTML and verse number markers like [16]. */
export function stripScriptureForMemorization(htmlOrText: string): string {
  const plain = stripHtmlTags(htmlOrText)
  return plain
    .replace(/\[\d+\]\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Count of completed practice sessions (used for mastery). */
export function countCompletedSessions(verse: MemorizedVerse): number {
  return verse.practiceSessions.filter((s) => s.completed).length
}

export function getMasterLevel(verse: MemorizedVerse): MemorizationMasterLevel {
  const n = countCompletedSessions(verse)
  if (n < 3) return 'learning'
  if (n < 9) return 'practicing'
  return 'mastered'
}

/** Returns false if duplicate reference+translation or storage failed. */
export function addMemorizedVerse(
  reference: string,
  text: string,
  translation: BibleTranslation
): boolean {
  const normalizedRef = reference.trim()
  const plain = stripScriptureForMemorization(text)
  if (!normalizedRef || !plain) return false

  const list = loadMemorizedVerses()
  const dup = list.some((v) => v.reference === normalizedRef && v.translation === translation)
  if (dup) return false

  const next: MemorizedVerse = {
    id: newId(),
    reference: normalizedRef,
    text: plain,
    translation,
    dateAdded: Date.now(),
    lastPracticedAt: null,
    practiceSessions: [],
  }
  persist([next, ...list])
  return true
}

export function removeMemorizedVerse(id: string): void {
  const list = loadMemorizedVerses().filter((v) => v.id !== id)
  persist(list)
}

export function isMemoizedForReference(
  reference: string,
  translation: BibleTranslation
): boolean {
  const r = reference.trim()
  return loadMemorizedVerses().some((v) => v.reference === r && v.translation === translation)
}

export interface PracticeSessionResult {
  wrongAttempts: number
  correctKeystrokes: number
  completed: boolean
}

export function updatePracticeStats(
  id: string,
  result: PracticeSessionResult
): MemorizedVerse | null {
  const list = loadMemorizedVerses()
  const idx = list.findIndex((v) => v.id === id)
  if (idx < 0) return null

  const verse = list[idx]
  const session: MemorizationPracticeSessionRecord = {
    date: Date.now(),
    wrongAttempts: result.wrongAttempts,
    correctKeystrokes: result.correctKeystrokes,
    completed: result.completed,
  }
  const updated: MemorizedVerse = {
    ...verse,
    inProgressPractice: undefined,
    lastPracticedAt: Date.now(),
    practiceSessions: [...verse.practiceSessions, session],
  }
  const next = [...list]
  next[idx] = updated
  persist(next)
  return updated
}

export function saveMemorizationInProgress(
  id: string,
  payload: MemorizationInProgressSavePayload
): MemorizedVerse | null {
  const list = loadMemorizedVerses()
  const idx = list.findIndex((v) => v.id === id)
  if (idx < 0) return null

  const verse = list[idx]
  const inProgressPractice: MemorizationInProgress = {
    ...payload,
    updatedAt: Date.now(),
  }
  const updated: MemorizedVerse = { ...verse, inProgressPractice }
  const next = [...list]
  next[idx] = updated
  persist(next)
  return updated
}

export function clearMemorizationInProgress(id: string): MemorizedVerse | null {
  const list = loadMemorizedVerses()
  const idx = list.findIndex((v) => v.id === id)
  if (idx < 0) return null

  const verse = list[idx]
  if (!verse.inProgressPractice) return verse

  const updated: MemorizedVerse = { ...verse }
  delete updated.inProgressPractice
  const next = [...list]
  next[idx] = updated
  persist(next)
  return updated
}
