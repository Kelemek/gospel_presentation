import fs from 'fs'
import path from 'path'
import { canonOrderIndexForUsfm } from '@/lib/calvin/calvinUsfmNormalize'
import { getCrossReferencesDataRoot } from '@/lib/cross-references-data-root'
import type { CrossReferenceLookupResult, CrossReferenceTarget } from '@/lib/cross-reference-types'
import { wordStudyTargetsFromReference } from '@/lib/step-bible-reference'

function parsePassageKeyForSort(
  passageKey: string
): { usfm: string; chapter: number; verse: number } | null {
  const match = passageKey.match(/^([A-Z0-9]+)\.(\d+)\.(\d+)/)
  if (!match) return null
  const chapter = parseInt(match[2], 10)
  const verse = parseInt(match[3], 10)
  if (!Number.isFinite(chapter) || !Number.isFinite(verse)) return null
  return { usfm: match[1], chapter, verse }
}

/** Protestant canon order (book → chapter → verse), then display reference. */
export function compareCrossReferencesByCanon(
  a: CrossReferenceTarget,
  b: CrossReferenceTarget
): number {
  const pa = parsePassageKeyForSort(a.passageKey)
  const pb = parsePassageKeyForSort(b.passageKey)
  if (pa && pb) {
    const bookDelta = canonOrderIndexForUsfm(pa.usfm) - canonOrderIndexForUsfm(pb.usfm)
    if (bookDelta !== 0) return bookDelta
    if (pa.chapter !== pb.chapter) return pa.chapter - pb.chapter
    if (pa.verse !== pb.verse) return pa.verse - pb.verse
  } else if (pa && !pb) return -1
  else if (!pa && pb) return 1
  return a.reference.localeCompare(b.reference)
}

type CrossRefShard = Record<string, CrossReferenceTarget[]>

const shardCache = new Map<string, CrossRefShard | null>()

export function clearCrossReferencesCache(): void {
  shardCache.clear()
}

function shardRelPath(usfm: string, chapter: number): string {
  return path.join(usfm, `${chapter}.json`)
}

function loadShard(usfm: string, chapter: number): CrossRefShard | null {
  const rel = shardRelPath(usfm, chapter)
  if (shardCache.has(rel)) return shardCache.get(rel) ?? null

  const filePath = path.join(getCrossReferencesDataRoot(), rel)
  if (!fs.existsSync(filePath)) {
    shardCache.set(rel, null)
    return null
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as CrossRefShard
    shardCache.set(rel, data)
    return data
  } catch {
    shardCache.set(rel, null)
    return null
  }
}

export function isCrossReferenceDataPresent(): boolean {
  const root = getCrossReferencesDataRoot()
  if (!fs.existsSync(root)) return false
  try {
    const entries = fs.readdirSync(root).filter((name) => !name.startsWith('.'))
    return entries.length > 0
  } catch {
    return false
  }
}

function targetsForVerse(usfm: string, chapter: number, verse: number): CrossReferenceTarget[] {
  const shard = loadShard(usfm, chapter)
  const list = shard?.[String(verse)]
  return Array.isArray(list) ? list : []
}

function mergeTargetsForReference(reference: string): CrossReferenceTarget[] {
  const targets = wordStudyTargetsFromReference(reference)
  if (targets.length === 0) return []

  const byPassageKey = new Map<string, CrossReferenceTarget>()
  for (const t of targets) {
    for (const row of targetsForVerse(t.usfm, t.chapter, t.verse)) {
      const existing = byPassageKey.get(row.passageKey)
      if (!existing || row.votes > existing.votes) {
        byPassageKey.set(row.passageKey, row)
      }
    }
  }

  return [...byPassageKey.values()].sort(compareCrossReferencesByCanon)
}

export function lookupCrossReferences(
  reference: string,
  offset = 0,
  limit = 50
): CrossReferenceLookupResult | null {
  const trimmed = reference.trim()
  if (!trimmed) return null

  const merged = mergeTargetsForReference(trimmed)
  if (merged.length === 0) return null

  const safeOffset = Math.max(0, offset)
  const safeLimit = Math.min(200, Math.max(1, limit))
  const items = merged.slice(safeOffset, safeOffset + safeLimit)

  return {
    reference: trimmed,
    total: merged.length,
    offset: safeOffset,
    limit: safeLimit,
    items,
  }
}

export function countCrossReferences(reference: string): number {
  return mergeTargetsForReference(reference.trim()).length
}
