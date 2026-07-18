import type { BibleTranslation } from '@/lib/bible-translations'
import { isBibleTranslation } from '@/lib/bible-translations'
import {
  bibleBooksPlainText,
  bibleBooksReferenceLabel,
  type BibleBooksMemorizationScope,
} from '@/lib/bibleBooksMemorization'
import {
  gospelStorageGetSync,
  gospelStorageSet,
  gospelStorageSetSync,
  hydrateGospelClientStorage,
} from '@/lib/gospelClientStorage'
import { VERSE_MEMORIZATION_STORAGE_KEY as MEMORIZATION_KEY } from '@/lib/gospelClientStoragePolicy'
import { idbGetItem, isIndexedDbWritable } from '@/lib/gospelClientKvStore'
import { stripHtmlTags } from '@/lib/stripHtmlTags'
import { MEMORIZATION_FULL_HIDE_ROUND } from '@/lib/memorizationPracticeUtils'

export const VERSE_MEMORIZATION_STORAGE_KEY = MEMORIZATION_KEY
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
export type MemorizationPracticeMode = 'type' | 'word' | 'reorder' | 'firstLetters'

export interface MemorizationInProgress {
  sessionSeed: string
  wrongAttempts: number
  correctKeystrokes: number
  updatedAt: number
  phase: MemorizationInProgressPhase
  practiceMode?: MemorizationPracticeMode
  /** Wrong attempts in the current round (strict-mode resume). */
  wrongAttemptsInRound?: number
}

/** Payload from the practice UI (storage sets `updatedAt`). */
export type MemorizationInProgressSavePayload = Omit<MemorizationInProgress, 'updatedAt'>

export type MemorizationItemKind = 'verse' | 'bibleBooks'

export type { BibleBooksMemorizationScope } from '@/lib/bibleBooksMemorization'

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
  /** Omitted means legacy verse memorization. */
  kind?: MemorizationItemKind
  /** Set when `kind === 'bibleBooks'`. */
  bibleBooksScope?: BibleBooksMemorizationScope
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
    practiceModeRaw === 'type' ||
    practiceModeRaw === 'word' ||
    practiceModeRaw === 'reorder' ||
    practiceModeRaw === 'firstLetters'
      ? practiceModeRaw
      : undefined
  const wrongAttemptsInRoundRaw = o.wrongAttemptsInRound
  const wrongAttemptsInRound: number | undefined =
    typeof wrongAttemptsInRoundRaw === 'number' && wrongAttemptsInRoundRaw >= 0
      ? wrongAttemptsInRoundRaw
      : undefined
  const p = phase as Record<string, unknown>
  const kind = p.kind
  if (kind === 'betweenRounds') {
    const completedRoundIndex = p.completedRoundIndex
    if (
      typeof completedRoundIndex !== 'number' ||
      completedRoundIndex < 1 ||
      completedRoundIndex > MEMORIZATION_FULL_HIDE_ROUND
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
      ...(wrongAttemptsInRound !== undefined ? { wrongAttemptsInRound } : {}),
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
      ...(wrongAttemptsInRound !== undefined ? { wrongAttemptsInRound } : {}),
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
  const kindRaw = o.kind
  const kind: MemorizationItemKind | undefined =
    kindRaw === 'verse' || kindRaw === 'bibleBooks' ? kindRaw : undefined
  const scopeRaw = o.bibleBooksScope
  const bibleBooksScope: BibleBooksMemorizationScope | undefined =
    scopeRaw === 'all' || scopeRaw === 'ot' || scopeRaw === 'nt' ? scopeRaw : undefined
  return {
    id,
    reference,
    text,
    translation,
    dateAdded,
    lastPracticedAt: typeof lastPracticedAt === 'number' ? lastPracticedAt : null,
    practiceSessions,
    ...(inProgressPractice ? { inProgressPractice } : {}),
    ...(kind ? { kind } : {}),
    ...(bibleBooksScope ? { bibleBooksScope } : {}),
  }
}

function parseMemorizationStorageRaw(raw: string | null): MemorizedVerse[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as StoredShape
    if (!parsed || parsed.v !== VERSE_MEMORIZATION_SCHEMA_VERSION || !Array.isArray(parsed.verses)) {
      return []
    }
    return parsed.verses.map(normalizeVerse).filter((v): v is MemorizedVerse => v !== null)
  } catch {
    return []
  }
}

function serializeMemorizationVerses(verses: MemorizedVerse[]): string {
  const payload: StoredShape = {
    v: VERSE_MEMORIZATION_SCHEMA_VERSION,
    verses,
  }
  return JSON.stringify(payload)
}

/** Migrates client storage; notifies listeners only if memorization bytes in memory changed. */
export async function hydrateMemorizedVersesStorage(): Promise<void> {
  const before = gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)
  await hydrateGospelClientStorage()
  if (!gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY)) {
    try {
      const idbValue = await idbGetItem(VERSE_MEMORIZATION_STORAGE_KEY)
      if (idbValue != null) {
        gospelStorageSetSync(VERSE_MEMORIZATION_STORAGE_KEY, idbValue)
      }
    } catch {
      /* ignore */
    }
  }
  if (gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY) !== before) {
    emitMemorizationChanged()
  }
}

export function loadMemorizedVerses(): MemorizedVerse[] {
  if (typeof window === 'undefined') return []
  return parseMemorizationStorageRaw(gospelStorageGetSync(VERSE_MEMORIZATION_STORAGE_KEY))
}

export const GOSPEL_MEMORIZATION_CHANGED_EVENT = 'gospel-memorization-changed'

export function emitMemorizationChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOSPEL_MEMORIZATION_CHANGED_EVENT))
}

export type AddMemorizedVerseFailureReason =
  | 'empty_reference'
  | 'empty_text'
  | 'duplicate'
  | 'storage_unavailable'
  | 'storage_full'

export type AddMemorizedVerseOutcome =
  | { ok: true }
  | { ok: false; reason: AddMemorizedVerseFailureReason }

const LS_WRITE_PROBE_KEY = '__gospel_ls_write_probe__'
const MAX_PRACTICE_SESSIONS_WHEN_COMPACTING = 12

/** True when a throwaway write succeeds (private mode / blocked storage often fails here). */
export function isLocalStorageWritable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(LS_WRITE_PROBE_KEY, '1')
    window.localStorage.removeItem(LS_WRITE_PROBE_KEY)
    return true
  } catch {
    return false
  }
}

/** Drop resume blobs and trim practice history so saves succeed when storage is tight. */
function compactVersesForStoragePressure(
  verses: MemorizedVerse[],
  level: 0 | 1 | 2
): MemorizedVerse[] {
  if (level === 0) return verses
  const withoutProgress = verses.map((verse) => {
    if (!verse.inProgressPractice) return verse
    const rest = { ...verse }
    delete rest.inProgressPractice
    return rest
  })
  if (level === 1) return withoutProgress
  return withoutProgress.map((verse) => ({
    ...verse,
    practiceSessions:
      verse.practiceSessions.length > MAX_PRACTICE_SESSIONS_WHEN_COMPACTING
        ? verse.practiceSessions.slice(-MAX_PRACTICE_SESSIONS_WHEN_COMPACTING)
        : verse.practiceSessions,
  }))
}

async function persistWithRetry(
  verses: MemorizedVerse[],
  opts?: { skipNotifyIfLevel0?: boolean }
): Promise<{ ok: true } | { ok: false; reason: 'storage_unavailable' | 'storage_full' }> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'storage_unavailable' }
  }
  for (const level of [0, 1, 2] as const) {
    const serialized = serializeMemorizationVerses(compactVersesForStoragePressure(verses, level))
    if (await gospelStorageSet(VERSE_MEMORIZATION_STORAGE_KEY, serialized)) {
      // `persist()` already notified at level 0; compacted saves still need a refresh.
      if (level > 0 || !opts?.skipNotifyIfLevel0) emitMemorizationChanged()
      return { ok: true }
    }
  }
  const idbWritable = await isIndexedDbWritable()
  return {
    ok: false,
    reason: idbWritable || isLocalStorageWritable() ? 'storage_full' : 'storage_unavailable',
  }
}

function persist(verses: MemorizedVerse[]): boolean {
  gospelStorageSetSync(VERSE_MEMORIZATION_STORAGE_KEY, serializeMemorizationVerses(verses))
  emitMemorizationChanged()
  void persistWithRetry(verses, { skipNotifyIfLevel0: true })
  return true
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

export async function tryAddMemorizedVerse(
  reference: string,
  text: string,
  translation: BibleTranslation
): Promise<AddMemorizedVerseOutcome> {
  await hydrateGospelClientStorage()

  const normalizedRef = reference.trim()
  if (!normalizedRef) return { ok: false, reason: 'empty_reference' }

  const plain = stripScriptureForMemorization(text)
  if (!plain) return { ok: false, reason: 'empty_text' }

  const list = loadMemorizedVerses()
  const dup = list.some(
    (v) =>
      (v.kind === 'verse' || v.kind == null) &&
      v.reference === normalizedRef &&
      v.translation === translation
  )
  if (dup) return { ok: false, reason: 'duplicate' }

  const next: MemorizedVerse = {
    id: newId(),
    reference: normalizedRef,
    text: plain,
    translation,
    dateAdded: Date.now(),
    lastPracticedAt: null,
    practiceSessions: [],
    kind: 'verse',
  }

  const merged = [next, ...list]
  const saved = await persistWithRetry(merged)
  if (saved.ok) return { ok: true }
  return { ok: false, reason: saved.reason }
}

export async function tryAddMemorizedBibleBooks(
  scope: BibleBooksMemorizationScope,
  translation: BibleTranslation
): Promise<AddMemorizedVerseOutcome> {
  await hydrateGospelClientStorage()

  const plain = bibleBooksPlainText(scope)
  if (!plain) return { ok: false, reason: 'empty_text' }

  const list = loadMemorizedVerses()
  const dup = list.some((v) => v.kind === 'bibleBooks' && v.bibleBooksScope === scope)
  if (dup) return { ok: false, reason: 'duplicate' }

  const next: MemorizedVerse = {
    id: newId(),
    reference: bibleBooksReferenceLabel(scope),
    text: plain,
    translation,
    dateAdded: Date.now(),
    lastPracticedAt: null,
    practiceSessions: [],
    kind: 'bibleBooks',
    bibleBooksScope: scope,
  }

  const merged = [next, ...list]
  const saved = await persistWithRetry(merged)
  if (saved.ok) return { ok: true }
  return { ok: false, reason: saved.reason }
}

/** Returns false if duplicate reference+translation or storage failed. */
export function addMemorizedVerse(
  reference: string,
  text: string,
  translation: BibleTranslation
): boolean {
  const normalizedRef = reference.trim()
  if (!normalizedRef) return false
  const plain = stripScriptureForMemorization(text)
  if (!plain) return false
  const list = loadMemorizedVerses()
  if (list.some((v) => v.reference === normalizedRef && v.translation === translation)) return false
  const next: MemorizedVerse = {
    id: newId(),
    reference: normalizedRef,
    text: plain,
    translation,
    dateAdded: Date.now(),
    lastPracticedAt: null,
    practiceSessions: [],
  }
  gospelStorageSetSync(VERSE_MEMORIZATION_STORAGE_KEY, serializeMemorizationVerses([next, ...list]))
  void persistWithRetry([next, ...list])
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
