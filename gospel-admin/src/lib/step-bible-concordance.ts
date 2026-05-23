import fs from 'fs'
import path from 'path'
import { normalizeStrongsForLookup } from '@/lib/step-bible-text'
import { getStepBibleDataRoot } from '@/lib/step-bible-data-root'
import { passageKeyToReference } from '@/lib/step-bible-reference'
import type {
  StepBibleConcordanceOccurrence,
  StepBibleConcordanceResult,
  StepBibleLanguage,
} from '@/lib/step-bible-types'

type ConcordanceShardFile = Record<
  string,
  Array<{ passageKey: string; position: number; gloss?: string }>
>

const shardCache = new Map<string, ConcordanceShardFile | null>()

export function clearStepBibleConcordanceCache(): void {
  shardCache.clear()
}

function concordanceShardFile(strongsKey: string): string {
  const m = strongsKey.match(/^([GH])(\d+)/)
  if (!m) return strongsKey
  const digits = m[2]
  /** H430 → H4; G3339 → G33 */
  const prefixLen = digits.length <= 3 ? 1 : 2
  return `${m[1]}${digits.slice(0, prefixLen)}`
}

function shardRelPath(language: StepBibleLanguage, strongsKey: string): string {
  const langDir = language === 'grc' ? 'greek' : 'hebrew'
  return path.join('concordance', langDir, `${concordanceShardFile(strongsKey)}.json`)
}

function loadShard(language: StepBibleLanguage, strongsKey: string): ConcordanceShardFile | null {
  const rel = shardRelPath(language, strongsKey)
  if (shardCache.has(rel)) return shardCache.get(rel) ?? null

  const filePath = path.join(getStepBibleDataRoot(), rel)
  if (!fs.existsSync(filePath)) {
    shardCache.set(rel, null)
    return null
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ConcordanceShardFile
    shardCache.set(rel, data)
    return data
  } catch {
    shardCache.set(rel, null)
    return null
  }
}

export function isConcordanceDataPresent(): boolean {
  const root = getStepBibleDataRoot()
  return (
    fs.existsSync(path.join(root, 'concordance', 'greek')) ||
    fs.existsSync(path.join(root, 'concordance', 'hebrew'))
  )
}

export function lookupConcordance(
  strongs: string,
  offset = 0,
  limit = 50
): StepBibleConcordanceResult | null {
  const norm = normalizeStrongsForLookup(strongs)
  if (!norm) return null

  const shard = loadShard(norm.language, norm.key)
  const raw = shard?.[norm.key]
  if (!raw?.length) return null

  const safeOffset = Math.max(0, offset)
  const safeLimit = Math.min(200, Math.max(1, limit))
  const slice = raw.slice(safeOffset, safeOffset + safeLimit)

  const occurrences: StepBibleConcordanceOccurrence[] = slice.map((occ) => ({
    passageKey: occ.passageKey,
    reference: passageKeyToReference(occ.passageKey) ?? occ.passageKey,
    position: occ.position,
    ...(occ.gloss ? { gloss: occ.gloss } : {}),
  }))

  return {
    strongs: norm.key,
    language: norm.language,
    total: raw.length,
    offset: safeOffset,
    limit: safeLimit,
    occurrences,
  }
}
